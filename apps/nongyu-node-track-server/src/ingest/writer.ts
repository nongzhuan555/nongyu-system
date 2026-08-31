import type { ItemError, RawEvent } from "./validate.js";
import { validateOne } from "./validate.js";
import { statDate } from "../bizday.js";
import type { Store } from "../store/sqlite/db.js";
import { insertEvent } from "../store/sqlite/events.js";
import { upsertPresence } from "../store/sqlite/presence.js";
import type { Syncer } from "../usersync/index.js";

export const ErrQueueFull = new Error("write queue full");

const heartbeatSampleMs = 5 * 60 * 1000;

export type BatchIn = {
  userId: number;
  studentNo: string;
  events: RawEvent[];
  now?: Date;
  skipPresence?: boolean;
};

export type BatchOut = {
  accepted: number;
  duplicated: number;
  rejected: number;
  errors: ItemError[];
};

type Job = {
  in: BatchIn;
  resolve: (out: BatchOut) => void;
  reject: (err: Error) => void;
};

/** 单 writer：有界队列 + 串行落库。 */
export class Writer {
  private queue: Job[] = [];
  private stopped = false;
  private running = false;
  private lastHeartbeat = new Map<number, number>();

  constructor(
    private store: Store,
    private syncer: Syncer | null,
    private queueSize: number,
  ) {}

  stop(): void {
    this.stopped = true;
  }

  /** 入队后由单 writer 落库；队列满返回 ErrQueueFull。 */
  enqueue(inBatch: BatchIn, signal?: AbortSignal): Promise<BatchOut> {
    if (this.queue.length >= this.queueSize) {
      return Promise.reject(ErrQueueFull);
    }
    return new Promise<BatchOut>((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason instanceof Error ? signal.reason : new Error("aborted"));
        return;
      }
      const job: Job = { in: inBatch, resolve, reject };
      const onAbort = () => {
        const idx = this.queue.indexOf(job);
        if (idx >= 0) this.queue.splice(idx, 1);
        reject(signal?.reason instanceof Error ? signal.reason : new Error("aborted"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.queue.push(job);
      this.kick();
    });
  }

  private kick(): void {
    if (this.running || this.stopped) return;
    this.running = true;
    queueMicrotask(() => this.loop());
  }

  private loop(): void {
    while (this.queue.length > 0 && !this.stopped) {
      const job = this.queue.shift()!;
      try {
        const out = this.process(job.in);
        job.resolve(out);
      } catch (err) {
        job.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
    this.running = false;
  }

  private process(inBatch: BatchIn): BatchOut {
    const out: BatchOut = { accepted: 0, duplicated: 0, rejected: 0, errors: [] };
    const now = inBatch.now ?? new Date();
    const received = now.getTime();
    const date = statDate(now);

    type Pending = {
      fields: NonNullable<ReturnType<typeof validateOne>["fields"]>;
      skipInsert: boolean;
    };
    const okItems: Pending[] = [];
    for (const raw of inBatch.events) {
      const result = validateOne(raw);
      if (result.error) {
        out.rejected++;
        out.errors.push(result.error);
        continue;
      }
      const fields = result.fields!;
      let skip = false;
      if (
        fields.eventType === "heartbeat" &&
        this.shouldSampleSkip(inBatch.userId, now.getTime())
      ) {
        skip = true;
      }
      okItems.push({ fields, skipInsert: skip });
    }

    let platform = "";
    let appVer = "";
    let brand = "";

    this.store.withWriteTx(() => {
      for (const item of okItems) {
        if (item.skipInsert) {
          out.accepted++;
          this.markHeartbeat(inBatch.userId, now.getTime());
          continue;
        }
        const dup = insertEvent(this.store, {
          eventId: item.fields.eventId,
          userId: inBatch.userId,
          studentNo: firstNonEmpty(item.fields.studentNo, inBatch.studentNo),
          eventType: item.fields.eventType,
          eventName: item.fields.eventName,
          appVersion: item.fields.appVersion,
          platform: item.fields.platform,
          deviceBrand: item.fields.deviceBrand,
          sessionId: item.fields.sessionId,
          durationMs: item.fields.durationMs,
          propsJson: item.fields.propsJson,
          clientTsMs: item.fields.clientTsMs,
          receivedAtMs: received,
          statDate: date,
        });
        if (dup) {
          out.duplicated++;
        } else {
          out.accepted++;
          if (item.fields.eventType === "heartbeat") {
            this.markHeartbeat(inBatch.userId, now.getTime());
          }
        }
        if (item.fields.platform) platform = item.fields.platform;
        if (item.fields.appVersion) appVer = item.fields.appVersion;
        if (item.fields.deviceBrand) brand = item.fields.deviceBrand;
      }
      if (okItems.length === 0 || inBatch.skipPresence) return;
      upsertPresence(this.store, {
        userId: inBatch.userId,
        online: true,
        lastSeenAtMs: received,
        platform,
        appVersion: appVer,
        deviceBrand: brand,
        updatedAtMs: received,
      });
    });

    if (okItems.length > 0 && !inBatch.skipPresence && this.syncer) {
      this.syncer.notify(inBatch.userId, true, received);
    }
    return out;
  }

  private shouldSampleSkip(userId: number, nowMs: number): boolean {
    const last = this.lastHeartbeat.get(userId);
    if (last === undefined) return false;
    return nowMs - last < heartbeatSampleMs;
  }

  private markHeartbeat(userId: number, nowMs: number): void {
    this.lastHeartbeat.set(userId, nowMs);
  }
}

function firstNonEmpty(a: string, b: string): string {
  return a !== "" ? a : b;
}

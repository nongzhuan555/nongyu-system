import type { Logger } from "pino";
import type { Store } from "../store/sqlite/db.js";
import { listTimedOut, upsertPresence } from "../store/sqlite/presence.js";
import type { Syncer } from "../usersync/index.js";

export class Scanner {
  private stopped = false;
  private loopPromise: Promise<void> | null = null;
  now: () => Date = () => new Date();

  constructor(
    private store: Store,
    private syncer: Syncer,
    private offlineAfterMs: number,
    private log: Logger,
  ) {}

  start(): void {
    this.loopPromise = this.loop();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.loopPromise) await this.loopPromise;
  }

  private async loop(): Promise<void> {
    this.scanOnce();
    while (!this.stopped) {
      await sleep(60_000);
      if (this.stopped) break;
      this.scanOnce();
    }
  }

  /** 将超时用户置离线并回写 Node。 */
  scanOnce(): void {
    const now = this.now();
    const cutoff = now.getTime() - this.offlineAfterMs;
    try {
      const ids = listTimedOut(this.store, cutoff);
      if (ids.length === 0) return;
      const ms = now.getTime();
      this.store.withWriteTx(() => {
        for (const id of ids) {
          upsertPresence(this.store, {
            userId: id,
            online: false,
            lastSeenAtMs: cutoff,
            platform: "",
            appVersion: "",
            deviceBrand: "",
            updatedAtMs: ms,
          });
        }
      });
      for (const id of ids) {
        this.syncer.notify(id, false, ms);
      }
    } catch (err) {
      this.log.error({ err }, "presence scan failed");
    }
  }
}

export function setOffline(store: Store, syncer: Syncer, userId: number, now: Date): void {
  const ms = now.getTime();
  store.withWriteTx(() => {
    upsertPresence(store, {
      userId,
      online: false,
      lastSeenAtMs: ms,
      platform: "",
      appVersion: "",
      deviceBrand: "",
      updatedAtMs: ms,
    });
  });
  syncer.notify(userId, false, ms);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

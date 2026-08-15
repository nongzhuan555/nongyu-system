import { appStorage } from "@/storage/mmkv";
import { newCourseExtId } from "../model/genId";
import type { CourseExtEntity, CourseExtOutboxOp } from "../model/syncTypes";

const OUTBOX_KEY_PREFIX = "course:outbox:";

function outboxKey(studentId: string): string {
  return `${OUTBOX_KEY_PREFIX}${studentId}`;
}

function readOps(studentId: string): CourseExtOutboxOp[] {
  const raw = appStorage.getString(outboxKey(studentId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CourseExtOutboxOp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOps(studentId: string, ops: CourseExtOutboxOp[]): void {
  appStorage.set(outboxKey(studentId), JSON.stringify(ops));
}

/**
 * 入队：同 entity+entityId+op 去重，保留最新
 */
export function enqueueOutbox(
  studentId: string,
  input: Omit<CourseExtOutboxOp, "id"> & { id?: string },
): void {
  const ops = readOps(studentId).filter(
    (o) => !(o.entity === input.entity && o.entityId === input.entityId && o.op === input.op),
  );
  ops.push({
    id: input.id ?? newCourseExtId(),
    op: input.op,
    entity: input.entity,
    entityId: input.entityId,
    payload: input.payload,
    updatedAt: input.updatedAt,
  });
  writeOps(studentId, ops);
}

export function readOutbox(studentId: string): CourseExtOutboxOp[] {
  return readOps(studentId);
}

export function writeOutbox(studentId: string, ops: CourseExtOutboxOp[]): void {
  writeOps(studentId, ops);
}

export function removeOutboxForEntity(
  studentId: string,
  entity: CourseExtEntity,
  entityId: string,
): void {
  writeOps(
    studentId,
    readOps(studentId).filter((o) => !(o.entity === entity && o.entityId === entityId)),
  );
}

export function clearOutbox(studentId: string): void {
  appStorage.delete(outboxKey(studentId));
}

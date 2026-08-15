import { appStorage } from "@/storage/mmkv";
import type { CourseExtEntity, CourseExtTombstone } from "../model/syncTypes";

const TOMBSTONES_KEY_PREFIX = "course:tombstones:";
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function tombstonesKey(studentId: string): string {
  return `${TOMBSTONES_KEY_PREFIX}${studentId}`;
}

function readAll(studentId: string): CourseExtTombstone[] {
  const raw = appStorage.getString(tombstonesKey(studentId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CourseExtTombstone[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(studentId: string, items: CourseExtTombstone[]): void {
  appStorage.set(tombstonesKey(studentId), JSON.stringify(items));
}

function prune(items: CourseExtTombstone[]): CourseExtTombstone[] {
  const cutoff = Date.now() - RETENTION_MS;
  return items.filter((t) => {
    const ms = Date.parse(t.deletedAt);
    return Number.isFinite(ms) && ms >= cutoff;
  });
}

export function readLocalTombstones(studentId: string): CourseExtTombstone[] {
  return prune(readAll(studentId));
}

export function upsertLocalTombstone(
  studentId: string,
  entity: CourseExtEntity,
  entityId: string,
  deletedAt: string = new Date().toISOString(),
): void {
  const next = prune(readAll(studentId)).filter(
    (t) => !(t.entity === entity && t.entityId === entityId),
  );
  next.push({ entity, entityId, deletedAt });
  writeAll(studentId, next);
}

/**
 * 与远程 tombstone 合并：同 key 取较新 deletedAt
 */
export function mergeTombstones(
  studentId: string,
  remote: CourseExtTombstone[],
): CourseExtTombstone[] {
  const map = new Map<string, CourseExtTombstone>();
  for (const t of [...readLocalTombstones(studentId), ...remote]) {
    const key = `${t.entity}:${t.entityId}`;
    const prev = map.get(key);
    if (!prev || Date.parse(t.deletedAt) >= Date.parse(prev.deletedAt)) {
      map.set(key, t);
    }
  }
  const merged = prune([...map.values()]);
  writeAll(studentId, merged);
  return merged;
}

export function clearLocalTombstones(studentId: string): void {
  appStorage.delete(tombstonesKey(studentId));
}

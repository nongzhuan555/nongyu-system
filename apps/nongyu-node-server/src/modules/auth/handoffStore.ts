import { randomBytes } from "node:crypto";

/** Handoff ticket 有效期（秒），与 Spec 一致 */
export const HANDOFF_TTL_SECONDS = 60;

type HandoffRecord = {
  userId: number;
  studentNo: string;
  expiresAt: number;
};

/** 进程内 ticket 仓：单实例部署；多实例需改 Redis */
const store = new Map<string, HandoffRecord>();

/**
 * 惰性清理过期条目，避免 Map 无限增长
 */
function purgeExpired(now = Date.now()): void {
  for (const [ticket, record] of store) {
    if (record.expiresAt <= now) store.delete(ticket);
  }
}

/**
 * 签发不透明 handoff ticket（URL-safe base64）
 */
export function createHandoffTicket(
  userId: number,
  studentNo: string,
): {
  ticket: string;
  expiresIn: number;
} {
  purgeExpired();
  const ticket = randomBytes(32).toString("base64url");
  store.set(ticket, {
    userId,
    studentNo,
    expiresAt: Date.now() + HANDOFF_TTL_SECONDS * 1000,
  });
  return { ticket, expiresIn: HANDOFF_TTL_SECONDS };
}

/**
 * 单次消费 ticket；无效 / 过期 / 已用返回 null
 */
export function consumeHandoffTicket(ticket: string): { userId: number; studentNo: string } | null {
  purgeExpired();
  const record = store.get(ticket);
  if (!record) return null;
  store.delete(ticket);
  if (record.expiresAt <= Date.now()) return null;
  return { userId: record.userId, studentNo: record.studentNo };
}

/** 仅测试：清空 ticket 仓 */
export function clearHandoffStoreForTests(): void {
  store.clear();
}

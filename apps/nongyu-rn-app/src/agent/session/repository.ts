import type { ChatMessage } from "nongyu-agent-sdk";
import { appStorage } from "@/storage/mmkv";
import {
  AGENT_SESSION_MAX,
  AGENT_SESSION_TITLE_MAX,
  type AgentChatSession,
  type AgentSessionBucket,
} from "./types";

function sessionsKey(studentId: string): string {
  return `agent:sessions:${studentId}`;
}

/**
 * 生成会话 id
 */
function newSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 从首条用户消息生成标题
 */
export function buildSessionTitle(messages: ChatMessage[]): string | null {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  if (!firstUser) return null;
  const text = firstUser.content.trim().replace(/\s+/g, " ");
  if (text.length <= AGENT_SESSION_TITLE_MAX) return text;
  return `${[...text].slice(0, AGENT_SESSION_TITLE_MAX).join("")}…`;
}

/**
 * 去掉欢迎语等非用户历史，仅保留可落盘消息；失败返回 null
 */
export function sanitizeMessagesForPersist(messages: ChatMessage[]): ChatMessage[] | null {
  try {
    const withoutWelcome = messages.filter(
      (m) => !(m.role === "assistant" && m.id.startsWith("welcome-")),
    );
    const cloned = JSON.parse(JSON.stringify(withoutWelcome)) as ChatMessage[];
    if (!cloned.some((m) => m.role === "user" && m.content.trim())) return null;
    return cloned;
  } catch {
    return null;
  }
}

function emptyBucket(): AgentSessionBucket {
  return { sessions: [], activeSessionId: null };
}

function readBucket(studentId: string): AgentSessionBucket {
  const raw = appStorage.getString(sessionsKey(studentId));
  if (!raw) return emptyBucket();
  try {
    const parsed = JSON.parse(raw) as AgentSessionBucket;
    if (!parsed || !Array.isArray(parsed.sessions)) return emptyBucket();
    return {
      sessions: parsed.sessions,
      activeSessionId: parsed.activeSessionId ?? null,
    };
  } catch {
    return emptyBucket();
  }
}

function writeBucket(studentId: string, bucket: AgentSessionBucket): void {
  appStorage.set(sessionsKey(studentId), JSON.stringify(bucket));
}

/**
 * 按 lastUsedAt 升序，淘汰超出上限的最旧会话
 */
function enforceLru(sessions: AgentChatSession[], keepId?: string): AgentChatSession[] {
  if (sessions.length <= AGENT_SESSION_MAX) return sessions;
  const sorted = [...sessions].sort((a, b) => a.lastUsedAt - b.lastUsedAt);
  const result = [...sessions];
  while (result.length > AGENT_SESSION_MAX) {
    const victim = sorted.find((s) => s.id !== keepId && result.some((r) => r.id === s.id));
    if (!victim) break;
    const idx = result.findIndex((r) => r.id === victim.id);
    if (idx >= 0) result.splice(idx, 1);
    sorted.splice(
      sorted.findIndex((s) => s.id === victim.id),
      1,
    );
  }
  return result;
}

/**
 * 列出某学号全部会话（按 updatedAt 降序，供 UI）
 */
export function listSessions(studentId: string): AgentChatSession[] {
  return [...readBucket(studentId).sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * 读取单条会话
 */
export function getSession(studentId: string, sessionId: string): AgentChatSession | null {
  return readBucket(studentId).sessions.find((s) => s.id === sessionId) ?? null;
}

/**
 * 当前活跃会话 id
 */
export function getActiveSessionId(studentId: string): string | null {
  return readBucket(studentId).activeSessionId;
}

/**
 * 设置活跃会话（null = 草稿）
 */
export function setActiveSessionId(studentId: string, sessionId: string | null): void {
  const bucket = readBucket(studentId);
  bucket.activeSessionId = sessionId;
  writeBucket(studentId, bucket);
}

/**
 * 打开会话时 touch lastUsedAt，并设为活跃
 */
export function touchSession(studentId: string, sessionId: string): AgentChatSession | null {
  const bucket = readBucket(studentId);
  const session = bucket.sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const now = Date.now();
  session.lastUsedAt = now;
  bucket.activeSessionId = sessionId;
  writeBucket(studentId, bucket);
  return session;
}

/**
 * 创建或更新会话；新建时可能 LRU 淘汰。成功返回会话，失败（无用户消息 / 序列化失败）返回 null。
 */
export function upsertSession(
  studentId: string,
  opts: {
    sessionId?: string | null;
    messages: ChatMessage[];
    /** 是否视为「用户发消息」从而 touch lastUsedAt（默认 true） */
    touch?: boolean;
  },
): AgentChatSession | null {
  const messages = sanitizeMessagesForPersist(opts.messages);
  if (!messages) return null;

  const title = buildSessionTitle(messages);
  if (!title) return null;

  const now = Date.now();
  const bucket = readBucket(studentId);
  const touch = opts.touch !== false;
  const existingId = opts.sessionId ?? null;
  const existing = existingId ? bucket.sessions.find((s) => s.id === existingId) : undefined;

  if (existing) {
    existing.messages = messages;
    existing.title = existing.title || title;
    existing.updatedAt = now;
    if (touch) existing.lastUsedAt = now;
    bucket.activeSessionId = existing.id;
    writeBucket(studentId, bucket);
    return existing;
  }

  const created: AgentChatSession = {
    id: newSessionId(),
    title,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    messages,
  };
  bucket.sessions.push(created);
  bucket.sessions = enforceLru(bucket.sessions, created.id);
  bucket.activeSessionId = created.id;
  // 若活跃被淘汰（理论上 keepId 保护不会），修正
  if (!bucket.sessions.some((s) => s.id === bucket.activeSessionId)) {
    bucket.activeSessionId = created.id;
  }
  writeBucket(studentId, bucket);
  return created;
}

/**
 * 写入模型压缩结果；失败时只推进游标并清除摘要。
 */
export function patchSessionLlmContext(
  studentId: string,
  sessionId: string,
  payload: { ok: boolean; llmSummary?: string; llmCompactedUntilId?: string },
): void {
  const bucket = readBucket(studentId);
  const session = bucket.sessions.find((s) => s.id === sessionId);
  if (!session) return;
  session.llmCompactedUntilId = payload.llmCompactedUntilId;
  if (payload.ok) {
    session.llmSummary = payload.llmSummary;
  } else {
    session.llmSummary = undefined;
  }
  session.updatedAt = Date.now();
  writeBucket(studentId, bucket);
}

/**
 * 删除单条；若删的是活跃会话则 active 置 null
 */
export function deleteSession(studentId: string, sessionId: string): void {
  const bucket = readBucket(studentId);
  bucket.sessions = bucket.sessions.filter((s) => s.id !== sessionId);
  if (bucket.activeSessionId === sessionId) bucket.activeSessionId = null;
  writeBucket(studentId, bucket);
}

/**
 * 清空某学号全部会话
 */
export function clearSessions(studentId: string): void {
  appStorage.delete(sessionsKey(studentId));
}

/**
 * 登出 / 鉴权失效：清指定学号；无学号则跳过
 */
export function clearAgentChatSessions(studentId: string | undefined | null): void {
  if (!studentId) return;
  clearSessions(studentId);
}

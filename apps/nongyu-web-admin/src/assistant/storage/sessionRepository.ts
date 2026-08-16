import type { ChatMessage } from "nongyu-agent-sdk";
import { assistantSessionsKey } from "../../lib/constants";
import {
  AGENT_SESSION_MAX,
  AGENT_SESSION_TITLE_MAX,
  type AgentChatSession,
  type AgentSessionBucket,
} from "./sessionTypes";

function newSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyBucket(): AgentSessionBucket {
  return { sessions: [], activeSessionId: null };
}

function readBucket(adminUserId: number): AgentSessionBucket {
  try {
    const raw = localStorage.getItem(assistantSessionsKey(adminUserId));
    if (!raw) return emptyBucket();
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

function writeBucket(adminUserId: number, bucket: AgentSessionBucket): void {
  try {
    localStorage.setItem(assistantSessionsKey(adminUserId), JSON.stringify(bucket));
  } catch {
    // 配额满时忽略，本轮仍可对话
  }
}

export function buildSessionTitle(messages: ChatMessage[]): string | null {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  if (!firstUser) return null;
  const text = firstUser.content.trim().replace(/\s+/g, " ");
  if (text.length <= AGENT_SESSION_TITLE_MAX) return text;
  return `${[...text].slice(0, AGENT_SESSION_TITLE_MAX).join("")}…`;
}

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

export function listSessions(adminUserId: number): AgentChatSession[] {
  return [...readBucket(adminUserId).sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getSession(adminUserId: number, sessionId: string): AgentChatSession | null {
  return readBucket(adminUserId).sessions.find((s) => s.id === sessionId) ?? null;
}

export function getActiveSessionId(adminUserId: number): string | null {
  return readBucket(adminUserId).activeSessionId;
}

export function setActiveSessionId(adminUserId: number, sessionId: string | null): void {
  const bucket = readBucket(adminUserId);
  bucket.activeSessionId = sessionId;
  writeBucket(adminUserId, bucket);
}

export function upsertSession(
  adminUserId: number,
  opts: {
    sessionId?: string | null;
    messages: ChatMessage[];
    touch?: boolean;
  },
): AgentChatSession | null {
  const messages = sanitizeMessagesForPersist(opts.messages);
  if (!messages) return null;
  const title = buildSessionTitle(messages);
  if (!title) return null;

  const now = Date.now();
  const bucket = readBucket(adminUserId);
  const touch = opts.touch !== false;
  const existingId = opts.sessionId ?? null;
  const existing = existingId ? bucket.sessions.find((s) => s.id === existingId) : undefined;

  if (existing) {
    existing.messages = messages;
    existing.title = existing.title || title;
    existing.updatedAt = now;
    if (touch) existing.lastUsedAt = now;
    bucket.activeSessionId = existing.id;
    writeBucket(adminUserId, bucket);
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
  writeBucket(adminUserId, bucket);
  return created;
}

export function patchSessionLlmContext(
  adminUserId: number,
  sessionId: string,
  payload: { ok: boolean; llmSummary?: string; llmCompactedUntilId?: string },
): void {
  const bucket = readBucket(adminUserId);
  const session = bucket.sessions.find((s) => s.id === sessionId);
  if (!session) return;
  session.llmCompactedUntilId = payload.llmCompactedUntilId;
  session.llmSummary = payload.ok ? payload.llmSummary : undefined;
  session.updatedAt = Date.now();
  writeBucket(adminUserId, bucket);
}

export function deleteSession(adminUserId: number, sessionId: string): void {
  const bucket = readBucket(adminUserId);
  bucket.sessions = bucket.sessions.filter((s) => s.id !== sessionId);
  if (bucket.activeSessionId === sessionId) bucket.activeSessionId = null;
  writeBucket(adminUserId, bucket);
}

export function clearSessions(adminUserId: number): void {
  try {
    localStorage.removeItem(assistantSessionsKey(adminUserId));
  } catch {
    // ignore
  }
}

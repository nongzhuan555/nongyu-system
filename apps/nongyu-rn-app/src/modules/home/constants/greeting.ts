/**
 * 按时段返回中文标签（对齐旧版问候语义）
 */
export function getTimeSlotLabel(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 0 && hour < 5) return "深夜";
  if (hour >= 5 && hour < 8) return "清晨";
  if (hour >= 8 && hour < 11) return "上午";
  if (hour >= 11 && hour < 13) return "中午";
  if (hour >= 13 && hour < 17) return "下午";
  if (hour >= 17 && hour < 19) return "傍晚";
  return "晚上";
}

/** 接口失败 / 无启用文案时的第二句兜底 */
export const DEFAULT_GREETING_MESSAGE = "祝你今天学习顺利";

/**
 * 第一段：有姓名「xx，晚上好」；否则「你好，晚上好」
 */
export function buildGreetingLead(name?: string | null, date = new Date()): string {
  const slot = getTimeSlotLabel(date);
  const trimmed = name?.trim();
  if (trimmed) {
    return `${trimmed}，${slot}好`;
  }
  return `你好，${slot}好`;
}

/**
 * 完整问候：第一段 + 中文逗号 + 第二段（同一视觉句，不强制换行）
 */
export function composeGreetingFullText(lead: string, message: string): string {
  return `${lead}，${message.trim()}`;
}

/** 打字机预留：最多 3 行（字号 26 / 行高 34） */
export const GREETING_MAX_LINES = 3;
export const GREETING_RESERVED_HEIGHT = 34 * GREETING_MAX_LINES;

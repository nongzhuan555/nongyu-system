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

/**
 * 本地问候文案：有姓名则「xx你好…」，否则回退无姓名版
 */
export function buildGreetingText(name?: string | null, date = new Date()): string {
  const slot = getTimeSlotLabel(date);
  const trimmed = name?.trim();
  if (trimmed) {
    return `${trimmed}你好，现在是${slot}，祝你学习顺利`;
  }
  return `你好，现在是${slot}，祝你学习顺利`;
}

/** 打字机预留：约 2 行（字号 26 / 行高 34），避免问候区留白过大 */
export const GREETING_RESERVED_HEIGHT = 34 * 2;

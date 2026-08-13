/**
 * 按学号/姓名 hash 选取头像渐变色（对齐旧版 Profile 思路）
 */
export function avatarGradientFor(seed: string): [string, string] {
  const text = seed.trim() || "nongyu";
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  const palettes: [string, string][] = [
    ["#FF9A9E", "#FECFEF"],
    ["#a18cd1", "#fbc2eb"],
    ["#84fab0", "#8fd3f4"],
    ["#e0c3fc", "#8ec5fc"],
    ["#fccb90", "#d57eeb"],
    ["#f093fb", "#f5576c"],
    ["#4facfe", "#00f2fe"],
  ];
  return palettes[Math.abs(hash) % palettes.length]!;
}

/**
 * 按时段返回简短问候
 */
export function guestGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "夜深了";
  if (hour < 11) return "早上好";
  if (hour < 13) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

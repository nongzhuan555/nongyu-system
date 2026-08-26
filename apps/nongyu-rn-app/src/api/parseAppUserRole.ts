/**
 * 从 App 用户资料解析 role
 */
export function parseAppUserRole(
  user: Record<string, unknown> | null | undefined,
): 0 | 1 | 2 | null {
  if (!user) return null;
  const raw = user.role;
  if (raw === 0 || raw === 1 || raw === 2) return raw;
  if (raw === "0") return 0;
  if (raw === "1") return 1;
  if (raw === "2") return 2;
  return null;
}

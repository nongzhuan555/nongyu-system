/**
 * 从 App 用户资料解析 role
 */
export function parseAppUserRole(user: Record<string, unknown> | null | undefined): 0 | 1 | null {
  if (!user) return null;
  const raw = user.role;
  if (raw === 0 || raw === 1) return raw;
  if (raw === "0") return 0;
  if (raw === "1") return 1;
  return null;
}

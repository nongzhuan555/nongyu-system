/**
 * 教务列表本地搜索：不区分大小写的子串匹配
 */
export function matchSearchQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => (field ?? "").toLowerCase().includes(q));
}

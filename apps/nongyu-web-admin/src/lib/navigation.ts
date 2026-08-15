import { ROUTES } from "./constants";

/** 防止开放重定向：只接受站内路径。 */
export function safeInternalPath(from: unknown): string {
  if (typeof from !== "string") return ROUTES.workspace;
  if (!from.startsWith("/") || from.startsWith("//")) return ROUTES.workspace;
  if (from === ROUTES.login || from.startsWith(`${ROUTES.login}?`)) return ROUTES.workspace;
  return from;
}

export function resolveLoginType(search: string): "browser" | "in_app" {
  const params = new URLSearchParams(search);
  return params.get("loginType") === "in_app" ? "in_app" : "browser";
}

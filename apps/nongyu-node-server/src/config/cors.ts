import type { CorsOptions } from "cors";
import type { Env } from "./env.js";

/** Vite 管理端 dev / preview 常用 Origin（开发留空 CORS_ORIGIN 时默认放行） */
export const DEV_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
] as const;

const ORIGIN_PATTERN = /^https?:\/\/[^\s/]+(?::\d+)?$/;

export type ParsedCorsOrigin = "allow-all" | "use-defaults" | string[];

/** 解析 CORS_ORIGIN：`*` 全放行；留空走环境默认；逗号分隔为白名单 */
export function parseCorsOriginEnv(raw: string): ParsedCorsOrigin {
  const trimmed = raw.trim();
  if (trimmed === "*") return "allow-all";
  if (trimmed === "") return "use-defaults";

  const origins = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const origin of origins) {
    if (!ORIGIN_PATTERN.test(origin)) {
      throw new Error(`Invalid CORS_ORIGIN entry "${origin}": expected http(s)://host[:port]`);
    }
  }

  return origins;
}

/** 留空时：development/test 放行本地管理端 Origin；production 禁止跨域（走 Nginx 同源反代） */
export function resolveCorsOrigins(
  env: Pick<Env, "CORS_ORIGIN" | "NODE_ENV">,
): "allow-all" | string[] {
  const parsed = parseCorsOriginEnv(env.CORS_ORIGIN);
  if (parsed === "allow-all") return "allow-all";
  if (parsed !== "use-defaults") return parsed;

  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
    return [...DEV_CORS_ORIGINS];
  }

  return [];
}

const CORS_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;
const CORS_ALLOWED_HEADERS = ["Content-Type", "Authorization", "X-Request-Id"] as const;
const CORS_EXPOSED_HEADERS = ["X-Request-Id"] as const;

function sharedCorsOptions(
  env: Env,
): Pick<CorsOptions, "methods" | "allowedHeaders" | "exposedHeaders" | "maxAge" | "credentials"> {
  return {
    methods: [...CORS_METHODS],
    allowedHeaders: [...CORS_ALLOWED_HEADERS],
    exposedHeaders: [...CORS_EXPOSED_HEADERS],
    maxAge: env.NODE_ENV === "production" ? 86_400 : 600,
    // 鉴权走 Authorization Bearer，不用 Cookie
    credentials: false,
  };
}

export function buildCorsOptions(env: Env): CorsOptions {
  const resolved = resolveCorsOrigins(env);
  const shared = sharedCorsOptions(env);

  if (resolved === "allow-all") {
    return { ...shared, origin: true };
  }

  if (resolved.length === 0) {
    return { origin: false, credentials: false };
  }

  const allowed = new Set(resolved);
  return {
    ...shared,
    origin(origin, callback) {
      // 无 Origin：curl、RN、服务端内部调用
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowed.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
  };
}

/** 生产环境仍使用 * 时打警告，便于运维收紧配置 */
export function warnUnsafeCorsInProduction(env: Env): void {
  if (env.NODE_ENV !== "production") return;
  if (env.CORS_ORIGIN.trim() !== "*") return;
  console.warn(
    "[cors] CORS_ORIGIN=* in production allows any browser origin. Prefer explicit admin origin(s) or leave empty when using Nginx same-origin proxy.",
  );
}

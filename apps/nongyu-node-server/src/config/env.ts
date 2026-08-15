import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../..");

export function loadEnvFiles(envFile?: string) {
  if (envFile) {
    loadDotenv({ path: path.isAbsolute(envFile) ? envFile : path.resolve(process.cwd(), envFile) });
  } else {
    loadDotenv({ path: path.join(appRoot, ".env") });
    if (process.env.NODE_ENV === "test") {
      loadDotenv({ path: path.join(appRoot, ".env.test"), override: true });
    }
  }
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MYSQL_HOST: z.string().min(1),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().min(1),
  MYSQL_PASSWORD: z.string(),
  MYSQL_DATABASE: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  /** App Access Token TTL，如 60d */
  JWT_APP_TTL: z.string().default("60d"),
  /**
   * 历史字段：Admin JWT 已改为不设 exp，读取后忽略。
   * 保留以免旧 .env 校验失败。
   */
  JWT_ADMIN_TTL: z.string().default("7d"),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(10),
  BUSINESS_TZ: z.string().default("Asia/Shanghai"),
  CORS_ORIGIN: z.string().default("*"),
  INTERNAL_TOKEN: z.string().min(16),
  /** Track 根地址，无尾斜杠；Node 代理 Admin 指标时使用 */
  TRACK_BASE_URL: z
    .string()
    .min(1)
    .default("http://127.0.0.1:8082")
    .transform((value) => value.replace(/\/+$/, "")),
  SUPER_ADMIN_STUDENT_NO: z
    .string()
    .regex(/^\d{9}$/)
    .default("202308596"),
  /** 超管出厂默认密码；未配置时无库超管仅能靠已设哈希登录 */
  SUPER_ADMIN_DEFAULT_PASSWORD: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${detail}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCache() {
  cached = null;
}

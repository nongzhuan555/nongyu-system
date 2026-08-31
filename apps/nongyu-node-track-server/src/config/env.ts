import "dotenv/config";

/** 配置来自环境变量；缺必填项时进程不得启动。键名兼容现网 /etc/nongyu-track.env。 */
export type Config = {
  httpAddr: string;
  dbPath: string;
  jwtSecret: string;
  internalToken: string;
  nodeInternalBaseUrl: string;
  nodeInternalToken: string;
  presenceOfflineAfterMs: number;
  writeQueueSize: number;
  bodyLimitBytes: number;
  userRatePerMin: number;
  ipRatePerMin: number;
  /** 空字符串 = 关闭 Web 匿名上报口 */
  webSiteKey: string;
};

function required(key: string): string {
  const v = (process.env[key] ?? "").trim();
  if (!v) throw new Error(`missing required env ${key}`);
  return v;
}

function optionalInt(key: string, fallback: number, min?: number): number {
  const raw = (process.env[key] ?? "").trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || (min !== undefined && n < min)) {
    throw new Error(`invalid ${key}`);
  }
  return n;
}

export function loadConfig(): Config {
  const nodeInternalBaseUrl = required("NODE_INTERNAL_BASE_URL").replace(/\/+$/, "");
  return {
    httpAddr: required("HTTP_ADDR"),
    dbPath: required("DB_PATH"),
    jwtSecret: required("JWT_SECRET"),
    internalToken: required("INTERNAL_TOKEN"),
    nodeInternalBaseUrl,
    nodeInternalToken: required("NODE_INTERNAL_TOKEN"),
    presenceOfflineAfterMs: optionalInt("PRESENCE_OFFLINE_AFTER_MS", 600_000, 1000),
    writeQueueSize: optionalInt("WRITE_QUEUE_SIZE", 128, 1),
    bodyLimitBytes: optionalInt("BODY_LIMIT_BYTES", 1 << 20, 1024),
    userRatePerMin: optionalInt("USER_RATE_PER_MIN", 120, 1),
    ipRatePerMin: optionalInt("IP_RATE_PER_MIN", 300, 1),
    webSiteKey: (process.env.TRACK_WEB_SITE_KEY ?? process.env.WEB_SITE_KEY ?? "").trim(),
  };
}

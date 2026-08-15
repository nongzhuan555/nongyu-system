/**
 * App 运行时环境配置
 *
 * Node 联调：docs/nongyu-node-server/联调指南.md §2.6 / §7.1，docs/nongyu-rn-app/开发文档.md §4.7
 * Track 联调：docs/nongyu-rn-app/联调指南-埋点.md（本机默认 8082，避开 Metro 8081）
 * - 本机 / Expo Web：Node 默认 127.0.0.1:3000；Track 默认 127.0.0.1:8082
 * - Android 模拟器：EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000；Track 用 10.0.2.2:8082
 * - 真机同网：http://<电脑局域网IP>:3000 / :8082
 * - 真机跨网：https://<随机子域>.trycloudflare.com（Node 与 Track 各一条隧道）
 * - 广场联调：可设 EXPO_PUBLIC_DEV_APP_TOKEN（仅 __DEV__，勿提交真实 Token）
 * 改 .env 后须重启 Metro / 重开 App
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3000";

/** 埋点服务根地址（无尾斜杠）；契约见 docs/nongyu-go-track-server/接口文档.md */
export const TRACK_BASE_URL =
  process.env.EXPO_PUBLIC_TRACK_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8082";

/**
 * App 运行时环境配置
 *
 * 联调约定见 docs/nongyu-node-server/联调指南.md §2.6 / §7.1，以及 docs/nongyu-rn-app/开发文档.md §4.7
 * - 本机 / Expo Web：默认 127.0.0.1:3000
 * - Android 模拟器访问本机 Node：EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
 * - 真机同网：http://<电脑局域网IP>:3000
 * - 真机跨网：https://<随机子域>.trycloudflare.com（Cloudflare Quick Tunnel，见联调指南 §2.6）
 * - 广场联调：可设 EXPO_PUBLIC_DEV_APP_TOKEN（仅 __DEV__，勿提交真实 Token）
 * 改 .env 后须重启 Metro / 重开 App
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3000";

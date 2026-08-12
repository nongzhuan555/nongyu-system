/**
 * App 运行时环境配置
 *
 * 联调约定见 docs/nongyu-node-server/联调指南.md §7.1
 * - 本机 / Expo Web：默认 127.0.0.1:3000
 * - Android 模拟器访问本机 Node：设 EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
 * - 真机：设为电脑局域网 IP，如 http://192.168.x.x:3000
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3000";

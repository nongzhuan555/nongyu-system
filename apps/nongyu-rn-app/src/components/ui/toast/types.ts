/**
 * 全局 Toast 公共类型（业务侧只依赖本文件与 toast API）
 */

export type AppToastType = "success" | "error" | "info";

export type AppToastOptions = {
  /** 副文案；可选 */
  description?: string;
  /** 展示时长 ms；不传则按类型默认 */
  duration?: number;
};

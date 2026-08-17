/**
 * 全局 Toast 公共类型（业务侧只依赖本文件与 toast API）
 */

export type AppToastType = "success" | "error" | "info";

export type AppToastOptions = {
  /** 副文案；可选 */
  description?: string;
  /** 展示时长 ms；不传则按类型默认 */
  duration?: number;
  /**
   * 点击 toast 回调；不传则点击仅关闭。
   * 用于新回复通知点击跳转帖子详情等场景。
   */
  onPress?: () => void;
};

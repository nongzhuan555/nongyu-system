import { Grid } from "antd";

/**
 * Ant Design lg 断点（992px+）视为桌面壳层宽度。
 * 首帧 screens 未就绪时偏桌面，避免侧栏闪一下再消失。
 */
export function useIsLg(): boolean {
  const screens = Grid.useBreakpoint();
  return screens.lg ?? true;
}

/** md（768px+）：表格操作区 / Modal 可用较宽布局 */
export function useIsMd(): boolean {
  const screens = Grid.useBreakpoint();
  return screens.md ?? true;
}

/** 抽屉：桌面固定宽，移动端全宽 */
export function useDrawerWidth(desktopWidth = 480): number | string {
  return useIsLg() ? desktopWidth : "100%";
}

/** Modal：窄屏留边距，避免贴死屏幕边缘 */
export function useModalWidth(desktopWidth = 520): number | string {
  return useIsMd() ? desktopWidth : "calc(100vw - 32px)";
}

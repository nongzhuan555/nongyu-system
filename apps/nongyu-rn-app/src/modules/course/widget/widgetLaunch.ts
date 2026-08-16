/**
 * 桌面小组件冷启动 / 热启动要落到课表 Tab 的一次性标记
 */
let pendingCourseTab = false;

export function isWidgetCourseLaunchUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("from=widget") || /nongyu:\/\/course/.test(url);
}

export function markPendingCourseTabFromUrl(url: string | null | undefined): void {
  if (isWidgetCourseLaunchUrl(url)) {
    pendingCourseTab = true;
  }
}

export function consumePendingCourseTab(): boolean {
  if (!pendingCourseTab) return false;
  pendingCourseTab = false;
  return true;
}

export function peekPendingCourseTab(): boolean {
  return pendingCourseTab;
}

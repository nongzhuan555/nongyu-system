import {
  ASSISTANT_WIDTH_DEFAULT,
  ASSISTANT_WIDTH_MAX,
  ASSISTANT_WIDTH_MIN,
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
  STORAGE_SHELL_LAYOUT_KEY,
} from "./constants";

export type ShellLayoutPrefs = {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  assistantWidth: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampSidebarWidth(value: number): number {
  return clamp(Math.round(value), SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX);
}

export function clampAssistantWidth(value: number): number {
  return clamp(Math.round(value), ASSISTANT_WIDTH_MIN, ASSISTANT_WIDTH_MAX);
}

export function defaultShellLayout(): ShellLayoutPrefs {
  return {
    sidebarCollapsed: false,
    sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
    assistantWidth: ASSISTANT_WIDTH_DEFAULT,
  };
}

export function readShellLayout(): ShellLayoutPrefs {
  const fallback = defaultShellLayout();
  try {
    const raw = localStorage.getItem(STORAGE_SHELL_LAYOUT_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return fallback;
    const record = parsed as Record<string, unknown>;
    return {
      sidebarCollapsed: record.sidebarCollapsed === true,
      sidebarWidth:
        typeof record.sidebarWidth === "number"
          ? clampSidebarWidth(record.sidebarWidth)
          : fallback.sidebarWidth,
      assistantWidth:
        typeof record.assistantWidth === "number"
          ? clampAssistantWidth(record.assistantWidth)
          : fallback.assistantWidth,
    };
  } catch {
    return fallback;
  }
}

export function writeShellLayout(prefs: ShellLayoutPrefs): void {
  try {
    const next: ShellLayoutPrefs = {
      sidebarCollapsed: prefs.sidebarCollapsed,
      sidebarWidth: clampSidebarWidth(prefs.sidebarWidth),
      assistantWidth: clampAssistantWidth(prefs.assistantWidth),
    };
    localStorage.setItem(STORAGE_SHELL_LAYOUT_KEY, JSON.stringify(next));
  } catch {
    // 隐私模式或配额满时忽略
  }
}

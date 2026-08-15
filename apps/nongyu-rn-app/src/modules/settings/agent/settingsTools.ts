/**
 * 系统设置 Tools — 自然语言读写偏好（与设置页共用 Store）
 */
import { z } from "zod";
import { tool } from "nongyu-agent-sdk";
import { useAppLaunchPrefsStore } from "@/modules/settings/store/appLaunchPrefsStore";
import { useAppWebPrefsStore } from "@/modules/settings/store/appWebPrefsStore";
import { useCourseUiStore } from "@/modules/course/store/courseUiStore";
import { useThemePrefsStore } from "@/theme/themePrefsStore";
import { loadAgentConfig } from "@/storage/agentConfig";

const brandSchema = z.enum(["green", "sakura"]).describe("品牌色：green=川农新绿，sakura=樱花浅粉");
const appearanceSchema = z
  .enum(["light", "dark", "system"])
  .describe("外观：light=浅色，dark=暗色，system=跟随系统");
const sizeSchema = z.enum(["sm", "md", "lg"]).describe("档位：sm=小，md=中，lg=大");
const launchTabSchema = z.enum(["home", "course"]).describe("启动主 Tab：home=首页，course=课表");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * YYYY-MM-DD → 本地 00:00；非法抛错
 */
function parseLocalDateOnly(isoDate: string): Date {
  if (!DATE_RE.test(isoDate)) {
    throw new Error(`开学日格式须为 YYYY-MM-DD，收到：${isoDate}`);
  }
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    throw new Error(`开学日不是合法日历日：${isoDate}`);
  }
  return date;
}

/**
 * ms → YYYY-MM-DD（本地）
 */
function formatLocalDateOnly(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type SettingsSnapshot = {
  theme: { brand: "green" | "sakura"; appearance: "light" | "dark" | "system" };
  web: { openWebInApp: boolean };
  launch: { tab: "home" | "course" };
  course: {
    cardSize: "sm" | "md" | "lg";
    fontSize: "sm" | "md" | "lg";
    semesterStart: string | null;
    highlightToday: boolean;
  };
  agent: { configured: boolean };
};

async function buildSnapshot(): Promise<SettingsSnapshot> {
  const theme = useThemePrefsStore.getState();
  const web = useAppWebPrefsStore.getState();
  const launch = useAppLaunchPrefsStore.getState();
  const course = useCourseUiStore.getState();
  const agentCfg = await loadAgentConfig();

  return {
    theme: {
      brand: theme.brand,
      appearance: theme.appearance,
    },
    web: {
      openWebInApp: web.openWebInApp,
    },
    launch: {
      tab: launch.launchTab,
    },
    course: {
      cardSize: course.cardSize,
      fontSize: course.fontSize,
      semesterStart:
        course.semesterStartMs != null ? formatLocalDateOnly(course.semesterStartMs) : null,
      highlightToday: course.highlightTodayColumn,
    },
    agent: {
      configured: !!agentCfg,
    },
  };
}

export const settingsGetTool = tool({
  name: "settings_get",
  description:
    "查询当前 App 系统设置快照：主题（品牌色/外观）、网页打开方式、启动页（首页或课表）、课表偏好（卡片与字号档、开学日、今日列高亮）、以及农屿 Agent 是否已配置模型。不包含课表背景图，也不返回 API Key。",
  inputSchema: z.object({}),
  async execute() {
    const snapshot = await buildSnapshot();
    return JSON.stringify(snapshot);
  },
});

const updateInputSchema = z.object({
  themeBrand: brandSchema.optional(),
  themeAppearance: appearanceSchema.optional(),
  openWebInApp: z.boolean().optional().describe("true=应用内浏览器打开链接，false=系统浏览器"),
  launchTab: launchTabSchema.optional(),
  courseCardSize: sizeSchema.optional(),
  courseFontSize: sizeSchema.optional(),
  courseSemesterStart: z
    .string()
    .nullable()
    .optional()
    .describe("开学日 YYYY-MM-DD；传 null 表示清除"),
  courseHighlightToday: z.boolean().optional().describe("是否高亮今日列"),
});

const BRAND_LABEL: Record<string, string> = {
  green: "川农新绿",
  sakura: "樱花浅粉",
};
const APPEARANCE_LABEL: Record<string, string> = {
  light: "浅色",
  dark: "暗色",
  system: "跟随系统",
};
const SIZE_LABEL: Record<string, string> = { sm: "小", md: "中", lg: "大" };
const LAUNCH_LABEL: Record<string, string> = { home: "首页", course: "课表" };

/**
 * 将 settings_update 入参格式化为确认框文案
 */
export function formatSettingsUpdateConfirmMessage(input: unknown): string {
  const args = (input ?? {}) as Record<string, unknown>;
  const lines: string[] = [];

  if (typeof args.themeBrand === "string") {
    lines.push(`· 品牌色 → ${BRAND_LABEL[args.themeBrand] ?? args.themeBrand}`);
  }
  if (typeof args.themeAppearance === "string") {
    lines.push(`· 外观 → ${APPEARANCE_LABEL[args.themeAppearance] ?? args.themeAppearance}`);
  }
  if (typeof args.openWebInApp === "boolean") {
    lines.push(`· 网页打开 → ${args.openWebInApp ? "应用内" : "系统浏览器"}`);
  }
  if (typeof args.launchTab === "string") {
    lines.push(`· 启动页 → ${LAUNCH_LABEL[args.launchTab] ?? args.launchTab}`);
  }
  if (typeof args.courseCardSize === "string") {
    lines.push(`· 课表卡片 → ${SIZE_LABEL[args.courseCardSize] ?? args.courseCardSize}`);
  }
  if (typeof args.courseFontSize === "string") {
    lines.push(`· 课表字号 → ${SIZE_LABEL[args.courseFontSize] ?? args.courseFontSize}`);
  }
  if (args.courseSemesterStart !== undefined) {
    lines.push(
      args.courseSemesterStart === null
        ? "· 开学日 → 清除"
        : `· 开学日 → ${String(args.courseSemesterStart)}`,
    );
  }
  if (typeof args.courseHighlightToday === "boolean") {
    lines.push(`· 今日列高亮 → ${args.courseHighlightToday ? "开" : "关"}`);
  }

  if (lines.length === 0) return "将修改 App 系统设置，是否继续？";
  return `将进行以下修改：\n${lines.join("\n")}`;
}

export const settingsUpdateTool = tool({
  name: "settings_update",
  description:
    "更新 App 系统设置（可改多项，至少一项）。支持：themeBrand、themeAppearance、openWebInApp、launchTab（home|course）、courseCardSize、courseFontSize、courseSemesterStart（YYYY-MM-DD 或 null）、courseHighlightToday。禁止改课表背景图与 Agent API Key/Base URL/模型——若用户要改凭据，请口头引导去「设置 → 农屿 Agent」。执行前会弹出确认框，用户取消则不修改。",
  inputSchema: updateInputSchema,
  needsApproval: true,
  async execute(args) {
    const hasAny =
      args.themeBrand !== undefined ||
      args.themeAppearance !== undefined ||
      args.openWebInApp !== undefined ||
      args.launchTab !== undefined ||
      args.courseCardSize !== undefined ||
      args.courseFontSize !== undefined ||
      args.courseSemesterStart !== undefined ||
      args.courseHighlightToday !== undefined;

    if (!hasAny) {
      return JSON.stringify({ ok: false, error: "至少提供一个可写字段" });
    }

    const updated: string[] = [];

    try {
      if (args.themeBrand !== undefined) {
        useThemePrefsStore.getState().setBrand(args.themeBrand);
        updated.push("themeBrand");
      }
      if (args.themeAppearance !== undefined) {
        useThemePrefsStore.getState().setAppearance(args.themeAppearance);
        updated.push("themeAppearance");
      }
      if (args.openWebInApp !== undefined) {
        useAppWebPrefsStore.getState().setOpenWebInApp(args.openWebInApp);
        updated.push("openWebInApp");
      }
      if (args.launchTab !== undefined) {
        useAppLaunchPrefsStore.getState().setLaunchTab(args.launchTab);
        updated.push("launchTab");
      }
      if (args.courseCardSize !== undefined) {
        useCourseUiStore.getState().setCardSize(args.courseCardSize);
        updated.push("courseCardSize");
      }
      if (args.courseFontSize !== undefined) {
        useCourseUiStore.getState().setFontSize(args.courseFontSize);
        updated.push("courseFontSize");
      }
      if (args.courseSemesterStart !== undefined) {
        if (args.courseSemesterStart === null) {
          useCourseUiStore.getState().setSemesterStart(null);
        } else {
          useCourseUiStore
            .getState()
            .setSemesterStart(parseLocalDateOnly(args.courseSemesterStart));
        }
        updated.push("courseSemesterStart");
      }
      if (args.courseHighlightToday !== undefined) {
        useCourseUiStore.getState().setHighlightTodayColumn(args.courseHighlightToday);
        updated.push("courseHighlightToday");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "更新设置失败";
      return JSON.stringify({ ok: false, error: message });
    }

    const snapshot = await buildSnapshot();
    return JSON.stringify({ ok: true, updated, snapshot });
  },
});

/**
 * 系统设置工具集合，供 agent.ts 注册
 */
export const settingsTools = {
  settings_get: settingsGetTool,
  settings_update: settingsUpdateTool,
};

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { requireOptionalNativeModule } from "expo";
import type { CourseEntry, ScheduleEntry } from "../model/types";
import type { ExamScheduleItem } from "@/modules/jiaowu/components/ExamScheduleList";

const FILE_NAME = "widget_schedule.json";

async function notifyNativeWidget(): Promise<void> {
  if (Platform.OS !== "android") return;
  const native = requireOptionalNativeModule<{ notifyChanged: () => Promise<void> }>(
    "NongyuWidget",
  );
  await native?.notifyChanged();
}

function formatSemesterStart(date?: Date): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeExamStartTime(examTime?: string): string {
  if (!examTime) return "";
  const dateMatch = examTime.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (!dateMatch) return "";
  const year = dateMatch[1];
  const month = dateMatch[2].padStart(2, "0");
  const day = dateMatch[3].padStart(2, "0");
  const timeMatch = examTime.match(/(\d{1,2}):(\d{2})/);
  const hour = timeMatch ? timeMatch[1].padStart(2, "0") : "00";
  const minute = timeMatch ? timeMatch[2] : "00";
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

type WriteWidgetArgs = {
  courses: CourseEntry[];
  schedules: ScheduleEntry[];
  semesterStart?: Date | null;
  exams: ExamScheduleItem[];
  examReady: boolean;
};

/**
 * 将本人课表/日程/考试写入小组件快照并通知原生刷新
 */
export async function writeWidgetSchedule(args: WriteWidgetArgs): Promise<void> {
  if (Platform.OS !== "android") return;
  const dir = FileSystem.documentDirectory;
  if (!dir) return;
  try {
    const payload = {
      semesterStart: formatSemesterStart(args.semesterStart ?? undefined),
      courses: args.courses.map((c) => ({
        name: c.name,
        teacher: c.teacher,
        room: c.room,
        day: c.day,
        startPeriod: c.startPeriod,
        endPeriod: c.endPeriod,
        weeks: c.weeks,
        odd: !!c.odd,
        even: !!c.even,
        weeksList: Array.isArray(c.weeksList) ? c.weeksList : [],
      })),
      schedules: args.schedules.map((s) => ({
        title: s.title,
        location: s.location,
        day: s.day,
        startPeriod: s.startPeriod,
        endPeriod: s.endPeriod,
        weeksList: Array.isArray(s.weeksList) ? s.weeksList : [],
      })),
      exams: args.exams.map((e) => ({
        name: e.courseName,
        room: e.examRoom,
        method: e.assessmentMethod,
        startTime: normalizeExamStartTime(e.examTime),
        timeRaw: e.examTime ?? "",
        seat: e.seatNumber ?? "",
      })),
      examReady: !!args.examReady,
    };
    await FileSystem.writeAsStringAsync(`${dir}${FILE_NAME}`, JSON.stringify(payload));
    await notifyNativeWidget();
  } catch {
    // 小组件同步失败不影响课表主路径
  }
}

/**
 * 登出或无会话时清空快照
 */
export async function clearWidgetSchedule(): Promise<void> {
  if (Platform.OS !== "android") return;
  const dir = FileSystem.documentDirectory;
  if (!dir) return;
  try {
    const path = `${dir}${FILE_NAME}`;
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
    await notifyNativeWidget();
  } catch {
    // ignore
  }
}

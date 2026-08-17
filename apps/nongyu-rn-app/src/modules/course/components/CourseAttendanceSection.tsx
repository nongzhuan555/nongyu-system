import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ATTENDANCE_STATUS_LABEL,
  countFullAttendanceForCourse,
  formatFullAttendanceSummary,
} from "../model/attendanceSummary";
import { WEEKDAY_LABELS } from "../model/courseTimes";
import type { AttendanceStatus, CourseAttendance } from "../model/types";
import { trackClick } from "@/modules/telemetry";
import { createThemedStyles } from "@/theme/createThemedStyles";

const STATUS_OPTIONS: { status: AttendanceStatus; label: string }[] = [
  { status: "present", label: "签到" },
  { status: "late", label: "迟到" },
  { status: "absent", label: "缺勤" },
  { status: "leave", label: "请假" },
  { status: "nocheck", label: "未考勤" },
];

type CourseAttendanceSectionProps = {
  weekNumber: number;
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  attendance: CourseAttendance | null;
  /** 本门课全学期考勤（已按周排序） */
  courseAttendances: CourseAttendance[];
  onSelect: (status: AttendanceStatus) => void;
  onClear: () => void;
  busy?: boolean;
};

/**
 * 课程详情内考勤区块：本节五态 + 本学期汇总与记录列表
 */
export function CourseAttendanceSection({
  weekNumber,
  day,
  attendance,
  courseAttendances,
  onSelect,
  onClear,
  busy = false,
}: CourseAttendanceSectionProps) {
  const styles = useStyles();
  const semesterLabel = formatFullAttendanceSummary(
    countFullAttendanceForCourse(courseAttendances),
  );
  const dayLabel = WEEKDAY_LABELS[day - 1] ?? `周${day}`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>考勤</Text>
      <Text style={styles.hint}>
        本节 · 第{weekNumber}周 · {dayLabel}
        {attendance
          ? ` · 已记${STATUS_OPTIONS.find((o) => o.status === attendance.status)?.label}`
          : " · 未标记"}
      </Text>
      <View style={styles.chips}>
        {STATUS_OPTIONS.map((opt) => {
          const active = attendance?.status === opt.status;
          return (
            <Pressable
              key={opt.status}
              disabled={busy}
              onPress={() => {
                trackClick("course_attendance_set", { status: opt.status });
                onSelect(opt.status);
              }}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {attendance ? (
        <Pressable
          disabled={busy}
          onPress={() => {
            trackClick("course_attendance_clear");
            onClear();
          }}
          style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.clearText}>重置</Text>
        </Pressable>
      ) : null}

      <View style={styles.semesterBlock}>
        <Text style={styles.semesterTitle}>本学期考勤记录</Text>
        {semesterLabel ? (
          <Text style={styles.semesterSummary}>{semesterLabel}</Text>
        ) : (
          <Text style={styles.semesterEmpty}>本学期暂无考勤记录</Text>
        )}
        {courseAttendances.length > 0 ? (
          <View style={styles.recordList}>
            {courseAttendances.map((a) => (
              <View key={a.id} style={styles.recordRow}>
                <Text style={styles.recordMeta}>
                  第{a.week}周 · {WEEKDAY_LABELS[a.day - 1] ?? `周${a.day}`}
                </Text>
                <Text style={styles.recordStatus}>{ATTENDANCE_STATUS_LABEL[a.status]}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  wrap: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: `${t.color.textSecondary}18`,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: t.color.text,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: t.color.textSecondary,
    marginBottom: 10,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: `${t.color.brandMuted}40`,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: `${t.color.brand}18`,
    borderColor: `${t.color.brand}55`,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: t.color.textSecondary,
  },
  chipTextActive: {
    color: t.color.brand,
  },
  clearBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  clearText: {
    fontSize: 13,
    color: t.color.textSecondary,
  },
  semesterBlock: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: `${t.color.textSecondary}22`,
  },
  semesterTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: t.color.text,
    marginBottom: 6,
  },
  semesterSummary: {
    fontSize: 13,
    fontWeight: "600",
    color: t.color.brand,
    marginBottom: 8,
  },
  semesterEmpty: {
    fontSize: 12,
    color: t.color.textSecondary,
  },
  recordList: {
    gap: 6,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: `${t.color.brandMuted}35`,
  },
  recordMeta: {
    fontSize: 12,
    color: t.color.textSecondary,
  },
  recordStatus: {
    fontSize: 13,
    fontWeight: "600",
    color: t.color.text,
  },
}));

import { createThemedStyles } from "@/theme/createThemedStyles";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getTeacherCourseInfoByName } from "nongyu-tool-jiaowu";
import type { ToolRenderProps } from "@/agent-ui/registry";

type TeacherResult = Awaited<ReturnType<typeof getTeacherCourseInfoByName>>;
type Slot = NonNullable<TeacherResult["result"]>["slots"][number];
type Course = Slot["courses"][number];

type FlatItem = {
  dayOfWeek: number;
  period: string;
  slot: string;
} & Course;

function flattenSlots(slots: Slot[]): FlatItem[] {
  const result: FlatItem[] = [];
  for (const slot of slots) {
    for (const course of slot.courses) {
      result.push({ ...course, dayOfWeek: slot.dayOfWeek, period: slot.period, slot: slot.slot });
    }
  }
  return result;
}

const dayLabels = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function TeacherCourseCardInner({
  args,
  output,
  status,
  error,
}: ToolRenderProps<{ name: string }, TeacherResult>) {
  const styles = useStyles();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询教师课表失败"}</Text>
      </View>
    );
  }

  if (
    !output.success ||
    !output.result ||
    !output.result.slots ||
    output.result.slots.length === 0
  ) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>未找到教师 {args.name ? `「${args.name}」` : ""}的课表</Text>
      </View>
    );
  }

  const items = flattenSlots(output.result.slots).slice(0, 5);

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>{output.result.teacherName || args.name || "教师课表"}</Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <View key={`${item.courseName}-${item.location}-${index}`} style={styles.card}>
            <Text style={styles.courseName} numberOfLines={2}>
              {item.courseName || "未命名课程"}
            </Text>
            <Text style={styles.meta}>
              {[
                dayLabels[item.dayOfWeek] ?? "",
                item.period,
                item.slot,
                item.location,
                item.weekRange,
                item.weekPattern,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const TeacherCourseCard = memo(TeacherCourseCardInner);

const useStyles = createThemedStyles((t) => ({
  root: {
    width: "100%",
  },
  headerTitle: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
    marginBottom: t.space.sm,
  },
  list: {
    gap: t.space.sm,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.md,
    padding: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    gap: 6,
  },
  courseName: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
    lineHeight: 22,
  },
  meta: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: t.color.surfaceVariant,
  },
  emptyText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  errorText: {
    fontSize: t.fontSize.sm,
    color: t.color.danger,
  },
}));

import { createThemedStyles } from "@/theme/createThemedStyles";
import { Href, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ScheduleEntry, CourseNote, CourseTodo } from "@/modules/course/model/types";
import type { ToolRenderProps } from "@/agent-ui/registry";

type SnapshotOutput = {
  schedules: ScheduleEntry[];
  notes: CourseNote[];
  todos: CourseTodo[];
};

function CourseExtSnapshotCardInner({
  output,
  status,
  error,
}: ToolRenderProps<Record<string, never>, SnapshotOutput>) {
  const styles = useStyles();
  const router = useRouter();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询课表扩展数据失败"}</Text>
      </View>
    );
  }

  const schedules = output?.schedules ?? [];
  const notes = output?.notes ?? [];
  const todos = output?.todos ?? [];
  const total = schedules.length + notes.length + todos.length;

  if (total === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>暂无课表扩展数据</Text>
      </View>
    );
  }

  const navigate = () => router.replace("/course" as Href);

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>课表扩展快照</Text>
      <Pressable
        accessibilityRole="button"
        onPress={navigate}
        style={({ pressed }) => [styles.summaryCard, pressed && styles.pressed]}
      >
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{schedules.length}</Text>
          <Text style={styles.statLabel}>自定义日程</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{notes.length}</Text>
          <Text style={styles.statLabel}>课程备注</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{todos.length}</Text>
          <Text style={styles.statLabel}>课程待办</Text>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.moreBtn} onPress={navigate}>
        <Text style={styles.moreText}>打开课表 ›</Text>
      </Pressable>
    </View>
  );
}

export const CourseExtSnapshotCard = memo(CourseExtSnapshotCardInner);

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
  summaryCard: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.md,
    padding: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  pressed: {
    opacity: 0.75,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: t.color.brand,
  },
  statLabel: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: t.color.border,
  },
  moreBtn: {
    alignSelf: "flex-start",
    marginTop: t.space.sm,
    paddingHorizontal: t.space.sm,
    paddingVertical: t.space.xs,
    borderRadius: t.radius.full,
    backgroundColor: t.color.brandMuted,
  },
  moreText: {
    fontSize: t.fontSize.sm,
    color: t.color.brand,
    fontWeight: "600",
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
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.md,
    padding: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
}));

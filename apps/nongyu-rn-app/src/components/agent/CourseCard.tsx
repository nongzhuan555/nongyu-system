import { createThemedStyles } from "@/theme/createThemedStyles";
import { Href, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getCourseInfo } from "nongyu-tool-jiaowu";
import type { ToolRenderProps } from "@/agent-ui/registry";

type CourseResult = Awaited<ReturnType<typeof getCourseInfo>>;
type CourseRow = CourseResult["result"][number];

function CourseCardInner({ output, status, error }: ToolRenderProps<{}, CourseResult>) {
  const styles = useStyles();
  const router = useRouter();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询课表失败"}</Text>
      </View>
    );
  }

  if (!output.success || !Array.isArray(output.result) || output.result.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>暂无课表</Text>
      </View>
    );
  }

  const list = output.result.slice(0, 5);
  const hasMore = output.result.length > 5;

  const navigate = () => router.replace("/course" as Href);

  const renderItem = (item: CourseRow, index: number) => (
    <Pressable
      key={`${item.courseId ?? item.courseName}-${index}`}
      accessibilityRole="button"
      onPress={navigate}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.courseName} numberOfLines={2}>
        {item.courseName || "未命名课程"}
      </Text>
      <Text style={styles.meta}>
        {[
          item.scheduleTime,
          item.classroom,
          item.teacher,
          item.credit ? `${item.credit} 学分` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>课表</Text>
      <View style={styles.list}>{list.map(renderItem)}</View>
      {hasMore ? (
        <Pressable accessibilityRole="button" style={styles.moreBtn} onPress={navigate}>
          <Text style={styles.moreText}>打开课表 ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const CourseCard = memo(CourseCardInner);

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
  pressed: {
    opacity: 0.75,
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
}));

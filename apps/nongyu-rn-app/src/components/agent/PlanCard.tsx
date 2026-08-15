import { createThemedStyles } from "@/theme/createThemedStyles";
import { Href, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getPlanInfo } from "nongyu-tool-jiaowu";
import type { ToolRenderProps } from "@/agent-ui/registry";

type PlanResult = Awaited<ReturnType<typeof getPlanInfo>>;
type PlanCourse = NonNullable<PlanResult["result"]>["courses"][number];

function PlanCardInner({ output, status, error }: ToolRenderProps<{}, PlanResult>) {
  const styles = useStyles();
  const router = useRouter();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询培养方案失败"}</Text>
      </View>
    );
  }

  if (!output.success || !output.result || !Array.isArray(output.result.courses)) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>暂无培养方案</Text>
      </View>
    );
  }

  const courses = output.result.courses.slice(0, 5);
  const hasMore = output.result.courses.length > 5;

  const navigate = () => router.push("/home/jiaowu/plan" as Href);

  const renderItem = (course: PlanCourse, index: number) => (
    <Pressable
      key={`${course.courseCode ?? course.courseName}-${index}`}
      accessibilityRole="button"
      onPress={navigate}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.courseName} numberOfLines={2}>
        {course.courseName || "未命名课程"}
      </Text>
      <Text style={styles.meta}>
        {[
          course.courseCode,
          course.courseType,
          course.courseSystem,
          course.credits ? `${course.credits} 学分` : null,
          course.execSemester ? `第 ${course.execSemester} 学期` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>{output.result.title || "培养方案"}</Text>
      <View style={styles.list}>{courses.map(renderItem)}</View>
      {hasMore ? (
        <Pressable accessibilityRole="button" style={styles.moreBtn} onPress={navigate}>
          <Text style={styles.moreText}>查看全部 ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const PlanCard = memo(PlanCardInner);

const useStyles = createThemedStyles((t) => ({
  root: {
    width: "100%",
  },
  headerTitle: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.brand,
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
    gap: 4,
  },
  pressed: {
    opacity: 0.75,
  },
  courseName: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
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

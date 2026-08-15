import { createThemedStyles } from "@/theme/createThemedStyles";
import { Href, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getExamInfo } from "nongyu-tool-jiaowu";
import type { ToolRenderProps } from "@/agent-ui/registry";

type ExamResult = Awaited<ReturnType<typeof getExamInfo>>;
type ExamRow = ExamResult["result"][number];

function ExamCardInner({ output, status, error }: ToolRenderProps<{}, ExamResult>) {
  const styles = useStyles();
  const router = useRouter();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询考试安排失败"}</Text>
      </View>
    );
  }

  if (!output.success || !Array.isArray(output.result) || output.result.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>暂无考试安排</Text>
      </View>
    );
  }

  const list = output.result.slice(0, 5);
  const hasMore = output.result.length > 5;

  const navigate = () => router.push("/home/jiaowu/exam" as Href);

  const renderItem = (item: ExamRow, index: number) => (
    <Pressable
      key={`${item.courseName}-${index}`}
      accessibilityRole="button"
      onPress={navigate}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.course}>{item.courseName || "未命名课程"}</Text>
      {item.examTime ? <Text style={styles.time}>{item.examTime}</Text> : null}
      <Text style={styles.meta}>
        {[item.examRoom, item.seatNumber ? `座位 ${item.seatNumber}` : null, item.assessmentMethod]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>考试安排</Text>
      <View style={styles.list}>{list.map(renderItem)}</View>
      {hasMore ? (
        <Pressable accessibilityRole="button" style={styles.moreBtn} onPress={navigate}>
          <Text style={styles.moreText}>查看全部 ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const ExamCard = memo(ExamCardInner);

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
  course: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
  },
  time: {
    fontSize: t.fontSize.sm,
    color: t.color.brand,
    lineHeight: 20,
  },
  meta: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
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

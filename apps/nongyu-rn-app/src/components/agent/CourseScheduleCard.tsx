import { createThemedStyles } from "@/theme/createThemedStyles";
import { Href, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ScheduleEntry } from "@/modules/course/model/types";
import type { ToolRenderProps } from "@/agent-ui/registry";

const dayLabels = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function CourseScheduleCardInner({
  output,
  status,
  error,
}: ToolRenderProps<Record<string, never>, ScheduleEntry[]>) {
  const styles = useStyles();
  const router = useRouter();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询自定义日程失败"}</Text>
      </View>
    );
  }

  if (!Array.isArray(output) || output.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>暂无自定义日程</Text>
      </View>
    );
  }

  const items = output.slice(0, 5);
  const hasMore = output.length > 5;

  const navigate = () => router.replace("/course" as Href);

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>自定义日程</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={navigate}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <Text style={styles.title} numberOfLines={1}>
              {item.title || "未命名日程"}
            </Text>
            <Text style={styles.meta}>
              {[
                dayLabels[item.day] ?? "",
                `${item.startPeriod}-${item.endPeriod}节`,
                item.location,
                item.weeksList?.length ? `第 ${item.weeksList.join(",")} 周` : "全周",
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {item.content ? (
              <Text style={styles.content} numberOfLines={2}>
                {item.content}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>
      {hasMore ? (
        <Pressable accessibilityRole="button" style={styles.moreBtn} onPress={navigate}>
          <Text style={styles.moreText}>查看全部 {output.length} 条 ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const CourseScheduleCard = memo(CourseScheduleCardInner);

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
    gap: 4,
  },
  pressed: {
    opacity: 0.75,
  },
  title: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
  },
  meta: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 18,
  },
  content: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 18,
    marginTop: 2,
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

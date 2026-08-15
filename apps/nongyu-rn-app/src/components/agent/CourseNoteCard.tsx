import { createThemedStyles } from "@/theme/createThemedStyles";
import { Href, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CourseNote } from "@/modules/course/model/types";
import type { ToolRenderProps } from "@/agent-ui/registry";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

function CourseNoteCardInner({
  output,
  status,
  error,
}: ToolRenderProps<{ courseId?: string } | Record<string, never>, CourseNote[]>) {
  const styles = useStyles();
  const router = useRouter();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询课程备注失败"}</Text>
      </View>
    );
  }

  if (!Array.isArray(output) || output.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>暂无课程备注</Text>
      </View>
    );
  }

  const items = output.slice(0, 5);
  const hasMore = output.length > 5;

  const navigate = () => router.replace("/course" as Href);

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>课程备注</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={navigate}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <Text style={styles.content} numberOfLines={3}>
              {item.content || "无内容"}
            </Text>
            <Text style={styles.meta}>
              课程ID：{item.courseId} · {formatDate(item.updatedAt)}
            </Text>
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

export const CourseNoteCard = memo(CourseNoteCardInner);

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
  content: {
    fontSize: t.fontSize.md,
    color: t.color.text,
    lineHeight: 22,
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

import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import type { PostDetail } from "@/modules/center/api/posts";
import { subtypeLabel } from "@/modules/center/constants/subtypes";
import { formatPublishedAt, stripHtml } from "@/modules/center/utils/format";
import type { ToolRenderProps } from "@/agent-ui/registry";
import { createThemedStyles } from "@/theme/createThemedStyles";

type PlazaDetailArgs = { id: number };

/**
 * 广场帖子详情：Agent 内联单卡（对齐 PostCard 视觉，展示更多正文）
 */
function PlazaPostDetailCardInner({
  output,
  status,
  error,
}: ToolRenderProps<PlazaDetailArgs, PostDetail>) {
  const styles = useStyles();
  const router = useRouter();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "加载帖子详情失败"}</Text>
      </View>
    );
  }

  const meta = [
    formatPublishedAt(output.publishedAt),
    subtypeLabel(output.postType, output.subtype),
  ].join("  ·  ");
  const body = stripHtml(output.content);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`打开帖子：${output.title}`}
      onPress={() => router.push(`/center/post/${output.id}` as Href)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.title} numberOfLines={3}>
        {output.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {meta}
      </Text>
      <Text style={styles.body} numberOfLines={8}>
        {body}
      </Text>
      <Text style={styles.openHint}>查看完整内容 ›</Text>
    </Pressable>
  );
}

export const PlazaPostDetailCard = memo(PlazaPostDetailCardInner);

const useStyles = createThemedStyles((t) => ({
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    gap: 6,
  },
  pressed: {
    opacity: 0.72,
  },
  title: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  meta: {
    fontSize: 12,
    color: t.color.textSecondary,
    letterSpacing: 0.2,
    opacity: 0.85,
  },
  body: {
    marginTop: 4,
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 20,
  },
  openHint: {
    marginTop: 6,
    fontSize: t.fontSize.sm,
    color: t.color.brand,
    fontWeight: "600",
  },
  errorCard: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderColor: "transparent",
  },
  errorText: {
    fontSize: t.fontSize.sm,
    color: t.color.danger,
  },
}));

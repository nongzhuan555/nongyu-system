import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeTokens } from "@/theme/ThemeProvider";
import type { PostListItem } from "@/modules/center/api/posts";
import { subtypeLabel } from "@/modules/center/constants/subtypes";
import { formatPublishedAt } from "@/modules/center/utils/format";
import { createThemedStyles } from "@/theme/createThemedStyles";

type PostCardProps = {
  item: PostListItem;
  onPress: () => void;
  /** 「我的帖子」展示阅读量 */
  showViewCount?: boolean;
};

/**
 * 广场 / 我的帖子共用列表卡片（简约圆润）
 */
export function PostCard({ item, onPress, showViewCount }: PostCardProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const typeText = subtypeLabel(item.postType, item.subtype);
  // 反馈墙 / 大院对用户匿名，不展示作者名
  const metaParts = [formatPublishedAt(item.publishedAt), typeText];
  if (showViewCount && typeof item.viewCount === "number") {
    metaParts.push(`阅读 ${item.viewCount}`);
  }

  // 「我的帖子」回复角标：feedback 显示已回复/未回复；courtyard 显示 N 条留言
  const replyBadge = showViewCount
    ? item.postType === "feedback"
      ? item.hasReply
        ? { text: "已回复", color: t.color.brand }
        : { text: "未回复", color: t.color.textSecondary }
      : item.postType === "courtyard"
        ? typeof item.replyCount === "number" && item.replyCount > 0
          ? { text: `${item.replyCount} 条留言`, color: t.color.brand }
          : { text: "暂无留言", color: t.color.textSecondary }
        : null
    : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`打开帖子：${item.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.preview} numberOfLines={2}>
        {item.contentPreview}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta} numberOfLines={1}>
          {metaParts.join("  ·  ")}
        </Text>
        {replyBadge ? (
          <Text style={[styles.replyBadge, { color: replyBadge.color }]} numberOfLines={1}>
            {replyBadge.text}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

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
  preview: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 20,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: t.color.textSecondary,
    letterSpacing: 0.2,
    opacity: 0.85,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
    marginTop: 2,
  },
  replyBadge: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginLeft: "auto",
    flexShrink: 0,
  },
}));

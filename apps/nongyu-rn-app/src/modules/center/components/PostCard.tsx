import { Pressable, StyleSheet, Text } from "react-native";
import type { PostListItem } from "@/modules/center/api/posts";
import { subtypeLabel } from "@/modules/center/constants/subtypes";
import { formatPublishedAt } from "@/modules/center/utils/format";
import { lightTokens } from "@/theme/tokens";

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
  const typeText = subtypeLabel(item.postType, item.subtype);
  const metaParts = [formatPublishedAt(item.publishedAt), typeText];
  if (item.postType === "courtyard" && item.authorDisplayName) {
    metaParts.push(item.authorDisplayName);
  }
  if (showViewCount && typeof item.viewCount === "number") {
    metaParts.push(`阅读 ${item.viewCount}`);
  }

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
      <Text style={styles.meta} numberOfLines={1}>
        {metaParts.join("  ·  ")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightTokens.color.surface,
    borderRadius: lightTokens.radius.lg,
    paddingHorizontal: lightTokens.space.md,
    paddingVertical: lightTokens.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
    gap: 6,
  },
  pressed: {
    opacity: 0.72,
  },
  title: {
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
    color: lightTokens.color.text,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  preview: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
    lineHeight: 20,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: lightTokens.color.textSecondary,
    letterSpacing: 0.2,
    opacity: 0.85,
  },
});

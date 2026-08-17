import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "@/theme/ThemeProvider";
import type { MyPostReplyListItem } from "@/modules/center/api/postReplies";
import { formatPublishedAt, stripHtml } from "@/modules/center/utils/format";
import { createThemedStyles } from "@/theme/createThemedStyles";

const SUMMARY_MAX = 80;

type MyReplyListItemProps = {
  item: MyPostReplyListItem;
  /** 我发出的：可删 */
  showDelete?: boolean;
  deleting?: boolean;
  onPress: () => void;
  onDelete?: () => void;
};

/**
 * 截断摘要（去 HTML 后约 80 字）
 */
function summarize(content: string): string {
  const plain = stripHtml(content).replace(/\s+/g, " ").trim();
  if (plain.length <= SUMMARY_MAX) return plain;
  return `${plain.slice(0, SUMMARY_MAX)}…`;
}

/**
 * 「留言与回复」列表行：对齐广场 PostCard 的圆润 surface 卡片
 */
export function MyReplyListItem({
  item,
  showDelete,
  deleting,
  onPress,
  onDelete,
}: MyReplyListItemProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const kindLabel = item.kind === "admin_reply" ? "管理员回复" : showDelete ? "我的留言" : "留言";
  const kindIcon =
    item.kind === "admin_reply" ? "shield-checkmark-outline" : "chatbubble-ellipses-outline";

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`查看帖子 ${item.postTitle}`}
        onPress={onPress}
        style={({ pressed }) => [styles.mainPress, pressed && styles.pressed]}
      >
        <View style={styles.topRow}>
          <View style={styles.kindChip}>
            <Ionicons name={kindIcon} size={12} color={t.color.brand} />
            <Text style={styles.kindText}>{kindLabel}</Text>
          </View>
          <Text style={styles.time}>{formatPublishedAt(item.publishedAt)}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item.postTitle}
        </Text>
        <Text style={styles.summary} numberOfLines={2}>
          {summarize(item.content)}
        </Text>
      </Pressable>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`查看帖子 ${item.postTitle}`}
          onPress={onPress}
          hitSlop={4}
        >
          <Text style={styles.hint}>查看原帖</Text>
        </Pressable>
        <View style={styles.footerRight}>
          {showDelete && onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="删除留言"
              onPress={onDelete}
              disabled={deleting}
              hitSlop={8}
              style={styles.delBtn}
            >
              <Text style={[styles.delText, deleting && styles.delTextDisabled]}>
                {deleting ? "删除中" : "删除"}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="进入原帖"
            onPress={onPress}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={16} color={t.color.textSecondary} />
          </Pressable>
        </View>
      </View>
    </View>
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
    gap: 8,
  },
  mainPress: {
    gap: 8,
  },
  pressed: {
    opacity: 0.72,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: t.space.sm,
  },
  kindChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: t.radius.full,
    backgroundColor: t.color.brandMuted,
  },
  kindText: {
    fontSize: 11,
    fontWeight: "700",
    color: t.color.brand,
    letterSpacing: 0.2,
  },
  time: {
    fontSize: 12,
    color: t.color.textSecondary,
    opacity: 0.85,
  },
  title: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  summary: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 20,
  },
  footer: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hint: {
    fontSize: 12,
    color: t.color.brand,
    fontWeight: "600",
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
  },
  delBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  delText: {
    fontSize: 13,
    color: t.color.danger,
    fontWeight: "600",
  },
  delTextDisabled: {
    color: t.color.textSecondary,
  },
}));

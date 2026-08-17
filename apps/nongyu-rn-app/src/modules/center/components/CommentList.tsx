import { useThemeTokens } from "@/theme/ThemeProvider";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PostComment } from "@/modules/center/api/posts";
import { formatPublishedAt, stripHtml } from "@/modules/center/utils/format";
import { createThemedStyles } from "@/theme/createThemedStyles";

type CommentListProps = {
  comments: PostComment[] | undefined;
  deletingId?: number | null;
  onDelete?: (commentId: number) => void;
};

/**
 * 大院详情留言列表（完全匿名，仅 isMine 自识；本人可删自己的留言）。
 */
export function CommentList({ comments, deletingId, onDelete }: CommentListProps) {
  const styles = useStyles();
  const t = useThemeTokens();

  if (!comments || comments.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>还没有留言，来抢第一条～</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {comments.map((c) => {
        const isDeleting = deletingId === c.id;
        return (
          <View key={c.id} style={styles.item}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={16} color={t.color.textSecondary} />
            </View>
            <View style={styles.body}>
              <View style={styles.row}>
                <Text style={styles.author}>{c.isMine ? "我" : "匿名用户"}</Text>
                <Text style={styles.time}>{formatPublishedAt(c.publishedAt)}</Text>
                {c.isMine && onDelete ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="删除留言"
                    onPress={() => onDelete(c.id)}
                    disabled={isDeleting}
                    hitSlop={8}
                    style={styles.delBtn}
                  >
                    <Text style={[styles.delText, isDeleting && styles.delTextDisabled]}>
                      {isDeleting ? "删除中" : "删除"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.content}>{stripHtml(c.content)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  list: {
    gap: t.space.md,
  },
  item: {
    flexDirection: "row",
    gap: t.space.sm,
    paddingVertical: t.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.color.border,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.color.brandMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs,
    marginBottom: 4,
  },
  author: {
    fontSize: t.fontSize.sm,
    fontWeight: "600",
    color: t.color.text,
  },
  time: {
    fontSize: 12,
    color: t.color.textSecondary,
  },
  delBtn: {
    marginLeft: "auto",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  delText: {
    fontSize: 12,
    color: t.color.danger,
  },
  delTextDisabled: {
    opacity: 0.5,
  },
  content: {
    fontSize: t.fontSize.md,
    color: t.color.text,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  empty: {
    paddingVertical: t.space.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
}));

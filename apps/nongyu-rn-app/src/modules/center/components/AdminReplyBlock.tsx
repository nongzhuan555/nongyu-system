import { useThemeTokens } from "@/theme/ThemeProvider";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PostAdminReply } from "@/modules/center/api/posts";
import { formatPublishedAt, stripHtml } from "@/modules/center/utils/format";
import { createThemedStyles } from "@/theme/createThemedStyles";

type AdminReplyBlockProps = {
  reply: PostAdminReply | null | undefined;
};

/**
 * 反馈墙详情「管理员回复」区块（只读）。
 * 无回复时渲染占位提示。
 */
export function AdminReplyBlock({ reply }: AdminReplyBlockProps) {
  const styles = useStyles();
  const t = useThemeTokens();

  if (!reply) {
    return (
      <View style={styles.placeholder}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={t.color.textSecondary} />
        <Text style={styles.placeholderText}>暂无管理员回复</Text>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark-outline" size={16} color={t.color.brand} />
        <Text style={styles.label}>管理员回复</Text>
        <Text style={styles.time}>{formatPublishedAt(reply.publishedAt)}</Text>
      </View>
      <Text style={styles.content}>{stripHtml(reply.content)}</Text>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  block: {
    marginTop: t.space.lg,
    padding: t.space.lg,
    borderRadius: t.radius.md,
    backgroundColor: t.color.brandMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs,
    marginBottom: t.space.sm,
  },
  label: {
    fontSize: t.fontSize.sm,
    fontWeight: "600",
    color: t.color.brand,
    letterSpacing: 0.15,
  },
  time: {
    marginLeft: "auto",
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
  content: {
    fontSize: t.fontSize.md,
    color: t.color.text,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  placeholder: {
    marginTop: t.space.lg,
    padding: t.space.lg,
    borderRadius: t.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.space.xs,
  },
  placeholderText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
}));

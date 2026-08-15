import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { useSessionStore } from "@/stores/session";

/** 与底栏 AI 入口按钮同一资源 */
const NONGYU_AI_AVATAR = require("../../assets/nongyuai.jpg");

const SUGGESTIONS = [
  "查一下我的成绩",
  "本周有哪些二课活动",
  "看看我的课表",
  "帮我改成深色主题",
] as const;

type ChatEmptyStateProps = {
  onSuggestion: (text: string) => void;
};

/**
 * 新对话空态：居中品牌问候 + 快捷建议（对齐主流大模型聊天首页）
 */
export function ChatEmptyState({ onSuggestion }: ChatEmptyStateProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const userName = useSessionStore((s) => s.profile?.name?.trim()) || "同学";

  return (
    <View style={styles.root}>
      <View style={styles.mark}>
        <View style={styles.markRing}>
          <Image
            source={NONGYU_AI_AVATAR}
            style={styles.avatar}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        </View>
      </View>
      <Text style={styles.title}>{userName}你好！我是农小屿~</Text>
      <Text style={styles.subtitle}>农屿内置的智能校园助手</Text>

      <View style={styles.chips}>
        {SUGGESTIONS.map((text) => (
          <Pressable
            key={text}
            accessibilityRole="button"
            accessibilityLabel={text}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            onPress={() => onSuggestion(text)}
          >
            <Text style={styles.chipText}>{text}</Text>
            <Ionicons name="arrow-up-outline" size={14} color={t.color.textSecondary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.space.lg,
    paddingBottom: t.space.xl,
  },
  mark: {
    marginBottom: t.space.md,
  },
  markRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: t.fontSize.xl,
    fontWeight: "600",
    color: t.color.text,
    letterSpacing: 0.3,
    marginBottom: t.space.xs,
  },
  subtitle: {
    fontSize: t.fontSize.md,
    color: t.color.textSecondary,
    marginBottom: t.space.xl,
  },
  chips: {
    alignSelf: "stretch",
    gap: t.space.sm,
    maxWidth: 360,
    width: "100%",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
  },
  chipPressed: {
    backgroundColor: t.color.surfaceVariant,
  },
  chipText: {
    flex: 1,
    fontSize: t.fontSize.sm,
    color: t.color.text,
    marginRight: t.space.sm,
  },
}));

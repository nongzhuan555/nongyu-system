import { useState } from "react";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createThemedStyles } from "@/theme/createThemedStyles";

type CommentComposerProps = {
  pending?: boolean;
  onPost: (content: string) => void;
};

const MAX_LEN = 1000;

/**
 * 大院详情底部留言输入区。
 * 内部维护文本与字数；提交时回调 onPost 并清空。
 */
export function CommentComposer({ pending, onPost }: CommentComposerProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const [text, setText] = useState("");

  const trimmed = text.trim();
  const canPost = trimmed.length >= 1 && !pending;

  const handleSubmit = () => {
    if (!canPost) return;
    onPost(trimmed);
    setText("");
  };

  return (
    <View style={styles.root}>
      <View style={styles.inputWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="说点什么…"
          placeholderTextColor={t.color.textSecondary}
          maxLength={MAX_LEN}
          multiline
          style={styles.input}
          editable={!pending}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="发送留言"
        onPress={handleSubmit}
        disabled={!canPost}
        hitSlop={6}
        style={[styles.sendBtn, !canPost && styles.sendDisabled]}
      >
        {pending ? (
          <ActivityIndicator color={t.color.onBrand} size="small" />
        ) : (
          <Ionicons name="send" size={18} color={t.color.onBrand} />
        )}
      </Pressable>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: t.space.sm,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.color.border,
    backgroundColor: t.color.background,
  },
  inputWrap: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.xs,
    borderRadius: t.radius.lg,
    backgroundColor: t.color.brandMuted,
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: t.fontSize.sm,
    color: t.color.text,
    lineHeight: 22,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.4,
  },
}));

import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { createThemedStyles } from "@/theme/createThemedStyles";

type CommentComposerProps = {
  pending?: boolean;
  onPost: (content: string) => void;
  /** 键盘顶起后的底部垫高（安全区或键盘高度） */
  bottomInset?: number;
};

const MAX_LEN = 1000;
const SHOW_COUNT_AT = 800;
/** 单行约高；多行长到此上限后内部滚动，外层输入条位置不变 */
const INPUT_MIN_H = 40;
const INPUT_MAX_H = 112;

/**
 * 大院详情底部留言输入区。
 * 多行增高至 maxHeight 后内部滚动；底部对齐键盘上方由外层 bottomInset 控制。
 */
export function CommentComposer({ pending, onPost, bottomInset = 0 }: CommentComposerProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const [text, setText] = useState("");

  const trimmed = text.trim();
  const canPost = trimmed.length >= 1 && !pending;
  const showCount = text.length >= SHOW_COUNT_AT;

  const handleSubmit = () => {
    if (!canPost) return;
    onPost(trimmed);
    setText("");
  };

  return (
    <View style={[styles.root, { paddingBottom: Math.max(bottomInset, t.space.sm) }]}>
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="匿名留言，友善交流…"
            placeholderTextColor={t.color.textSecondary}
            maxLength={MAX_LEN}
            multiline
            scrollEnabled
            textAlignVertical="top"
            underlineColorAndroid="transparent"
            blurOnSubmit={false}
            editable={!pending}
            style={styles.input}
            accessibilityLabel="留言输入"
          />
          {showCount ? (
            <Text style={[styles.count, text.length >= MAX_LEN && styles.countLimit]}>
              {text.length}/{MAX_LEN}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="发送留言"
          onPress={handleSubmit}
          disabled={!canPost}
          hitSlop={6}
          style={({ pressed }) => [
            styles.sendBtn,
            !canPost && styles.sendDisabled,
            pressed && canPost && styles.sendPressed,
          ]}
        >
          {pending ? (
            <ActivityIndicator color={t.color.onBrand} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={20} color={t.color.onBrand} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.color.border,
    backgroundColor: t.color.surface,
    paddingHorizontal: t.space.md,
    paddingTop: t.space.sm,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: t.space.sm,
  },
  inputWrap: {
    flex: 1,
    minHeight: INPUT_MIN_H,
    maxHeight: INPUT_MAX_H + 22,
    paddingHorizontal: t.space.md,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: t.radius.lg,
    backgroundColor: t.color.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  input: {
    minHeight: INPUT_MIN_H - 12,
    maxHeight: INPUT_MAX_H,
    fontSize: t.fontSize.md,
    color: t.color.text,
    lineHeight: 22,
    padding: 0,
    margin: 0,
    // 禁止 flex:1，避免多行时把外层布局顶乱；超高由 maxHeight + scrollEnabled 承接
  },
  count: {
    alignSelf: "flex-end",
    marginTop: 4,
    fontSize: 11,
    color: t.color.textSecondary,
  },
  countLimit: {
    color: t.color.danger,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendDisabled: {
    opacity: 0.35,
  },
  sendPressed: {
    opacity: 0.88,
  },
}));

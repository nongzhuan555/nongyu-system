import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { lightTokens } from "@/theme/tokens";
import { performJiaowuLogin } from "@/modules/jiaowu/auth/performJiaowuLogin";

type JiaowuLoginFormProps = {
  /** 登录成功回调 */
  onSuccess?: () => void;
  /** 紧凑模式（嵌入教务首页） */
  compact?: boolean;
};

/**
 * 教务登录表单（全局登录页与教务页内共用）
 */
export function JiaowuLoginForm({ onSuccess, compact }: JiaowuLoginFormProps) {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await performJiaowuLogin({
        studentId,
        password,
        queryClient,
      });
      if (!result.ok) {
        Toast.show({
          type: "error",
          text1: "登录失败",
          text2: result.message || "请检查学号密码",
        });
        return;
      }
      Toast.show({
        type: "success",
        text1: "登录成功",
        text2: result.nodeOk
          ? "教务会话与农屿 Token 均已就绪"
          : "仅本地教务会话（农屿 Token 未签发）",
      });
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      {!compact ? (
        <>
          <Text style={styles.title}>教务登录</Text>
          <Text style={styles.subtitle}>使用教务系统学号与密码登录</Text>
        </>
      ) : (
        <Text style={styles.compactTitle}>登录后解锁成绩、考试等服务</Text>
      )}

      <TextInput
        style={styles.input}
        placeholder="学号"
        placeholderTextColor={lightTokens.color.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="number-pad"
        value={studentId}
        onChangeText={setStudentId}
        editable={!submitting}
      />
      <TextInput
        style={styles.input}
        placeholder="教务密码"
        placeholderTextColor={lightTokens.color.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!submitting}
        onSubmitEditing={handleSubmit}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="登录"
        disabled={submitting}
        onPress={handleSubmit}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          submitting && styles.disabled,
        ]}
      >
        {submitting ? (
          <ActivityIndicator color={lightTokens.color.onBrand} />
        ) : (
          <Text style={styles.buttonText}>登录</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: lightTokens.space.sm,
  },
  compact: {
    marginTop: lightTokens.space.md,
    padding: lightTokens.space.md,
    backgroundColor: lightTokens.color.surface,
    borderRadius: lightTokens.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
  },
  title: {
    fontSize: lightTokens.fontSize.xl,
    fontWeight: "700",
    color: lightTokens.color.brand,
  },
  subtitle: {
    fontSize: lightTokens.fontSize.md,
    color: lightTokens.color.textSecondary,
    marginBottom: lightTokens.space.sm,
    lineHeight: 22,
  },
  compactTitle: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: lightTokens.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
    borderRadius: lightTokens.radius.md,
    paddingHorizontal: lightTokens.space.md,
    paddingVertical: 12,
    fontSize: lightTokens.fontSize.md,
    color: lightTokens.color.text,
  },
  button: {
    marginTop: lightTokens.space.sm,
    backgroundColor: lightTokens.color.brand,
    paddingVertical: 14,
    borderRadius: lightTokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: lightTokens.color.onBrand,
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
  },
});

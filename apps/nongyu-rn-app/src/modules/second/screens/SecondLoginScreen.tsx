import { useThemeTokens } from "@/theme/ThemeProvider";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AppLinearGradient } from "@/components/ui/AppLinearGradient";
import { toast } from "@/components/ui/toast";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { performSecondLogin } from "@/modules/second/auth/performSecondLogin";
import { refreshSecondAuthFlag } from "@/modules/second/hooks/useSecondAuth";
import { useSessionStore } from "@/stores/session";
import { trackClick } from "@/modules/telemetry";

const STUDENT_ID_RE = /^\d{9}$/;

/**
 * 解析 returnTo（expo-router 可能给 string | string[]）
 */
function resolveReturnTo(raw: string | string[] | undefined): string | undefined {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw)) {
    const first = raw.find((v) => typeof v === "string" && v.trim());
    return first?.trim();
  }
  return undefined;
}

/**
 * 登录成功后离开登录页（不停留）
 */
function leaveSecondLoginPage(
  router: ReturnType<typeof useRouter>,
  returnTo: string | string[] | undefined,
): void {
  const target = resolveReturnTo(returnTo);
  if (target) {
    router.replace(target as Href);
    return;
  }
  if (typeof router.canDismiss === "function" && router.canDismiss()) {
    router.dismiss();
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/home/second" as Href);
}

/**
 * 二课独立登录页（对齐旧版 SecondLogin）
 */
export function SecondLoginScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useSessionStore((s) => s.profile);
  const [studentId, setStudentId] = useState(profile?.studentId ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();

  const canSubmit =
    STUDENT_ID_RE.test(studentId.trim()) && password.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    trackClick("second_login");
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await performSecondLogin({
        studentId,
        password,
        queryClient,
      });
      if (!result.ok) {
        toast.error("二课登录失败", {
          description: result.message || "请检查学号与二课密码",
        });
        return;
      }
      refreshSecondAuthFlag();
      toast.success("二课登录成功");
      // await 之后立刻离页，避免停在登录页
      leaveSecondLoginPage(router, returnTo);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <AppLinearGradient
        colors={[t.color.brandMuted, t.color.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.4]}
        style={StyleSheet.absoluteFill}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.flex, { paddingTop: insets.top }]}>
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="关闭"
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/home/second"))}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={t.color.text} />
            </Pressable>

            <View style={styles.header}>
              <View style={styles.iconWrap}>
                <Ionicons name="trophy-outline" size={48} color={t.color.brand} />
              </View>
              <Text style={styles.title}>二课系统登录</Text>
              <Text style={styles.subtitle}>开启你的第二课堂之旅</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={t.color.brand} />
                <TextInput
                  style={styles.input}
                  placeholder="学号"
                  placeholderTextColor={t.color.textSecondary}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  maxLength={9}
                  value={studentId}
                  onChangeText={setStudentId}
                  editable={!submitting}
                />
              </View>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={t.color.brand} />
                <TextInput
                  style={styles.input}
                  placeholder="二课密码"
                  placeholderTextColor={t.color.textSecondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!submitting}
                  onSubmitEditing={handleSubmit}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={t.color.textSecondary}
                  />
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={!canSubmit}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.pressed,
                  !canSubmit && styles.disabled,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={t.color.onBrand} />
                ) : (
                  <Text style={styles.buttonText}>立即登录</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.tips}>
              <View style={styles.tipsHeader}>
                <Ionicons name="information-circle-outline" size={16} color={t.color.text} />
                <Text style={styles.tipsTitle}>温馨提示</Text>
              </View>
              {[
                "农屿和 i川农是两套独立的系统",
                "想在农屿上集成 i川农的二课功能需要登录",
                "使用 i川农 / 二课密码（与教务密码可能不同）",
                "后续使用中登录过期会自动重登；若密码失效需重新登录",
              ].map((line) => (
                <View key={line} style={styles.tipItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.tipText}>{line}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: { flex: 1, backgroundColor: t.color.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  closeBtn: {
    alignSelf: "flex-start",
    marginBottom: 10,
    padding: 4,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  iconWrap: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 50,
    backgroundColor: t.color.brandMuted,
  },
  title: {
    fontWeight: "700",
    fontSize: 24,
    marginBottom: 8,
    color: t.color.text,
  },
  subtitle: {
    fontSize: t.fontSize.md,
    color: t.color.textSecondary,
  },
  form: { width: "100%", marginBottom: 40, gap: 16 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: t.color.surface,
  },
  input: {
    flex: 1,
    color: t.color.text,
    fontSize: t.fontSize.md,
    padding: 0,
  },
  button: {
    marginTop: 8,
    height: 50,
    borderRadius: 12,
    backgroundColor: t.color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: t.color.onBrand,
    fontSize: 16,
    fontWeight: "700",
  },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
  tips: { padding: 20, borderRadius: 16 },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  tipsTitle: {
    fontWeight: "700",
    color: t.color.text,
  },
  tipItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingRight: 16,
  },
  bullet: {
    marginRight: 8,
    fontWeight: "700",
    color: t.color.textSecondary,
  },
  tipText: {
    flex: 1,
    lineHeight: 20,
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
}));

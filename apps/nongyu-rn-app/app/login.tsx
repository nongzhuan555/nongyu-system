import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { lightTokens } from "@/theme/tokens";
import { useSessionStore } from "@/stores/session";

/**
 * 登录页骨架（教务直连与 Token 流程后续接入）
 */
export default function LoginScreen() {
  const setAuthenticated = useSessionStore((s) => s.setAuthenticated);

  const handleMockLogin = () => {
    setAuthenticated(true);
    Toast.show({
      type: "success",
      text1: "骨架登录成功",
      text2: "后续将接入教务校验与后端 Token",
    });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>欢迎来到农屿</Text>
      <Text style={styles.subtitle}>
        登录骨架页。正式流程：App 直连教务校验 → 自家后端签发 Token。
      </Text>
      <Pressable style={styles.button} onPress={handleMockLogin}>
        <Text style={styles.buttonText}>模拟登录</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: lightTokens.space.lg,
    backgroundColor: lightTokens.color.brandMuted,
    justifyContent: "center",
  },
  title: {
    fontSize: lightTokens.fontSize.xl,
    color: lightTokens.color.brand,
    fontWeight: "700",
    marginBottom: lightTokens.space.sm,
  },
  subtitle: {
    fontSize: lightTokens.fontSize.md,
    color: lightTokens.color.textSecondary,
    lineHeight: 24,
    marginBottom: lightTokens.space.xl,
  },
  button: {
    backgroundColor: lightTokens.color.brand,
    paddingVertical: lightTokens.space.md,
    borderRadius: lightTokens.radius.md,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
  },
});

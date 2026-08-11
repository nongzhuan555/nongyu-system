import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PlaceholderScreen } from "@/components/navigation/PlaceholderScreen";
import { lightTokens } from "@/theme/tokens";
import { useSessionStore } from "@/stores/session";

/**
 * 「我的」页骨架（对应 src/modules/mine）
 */
export default function MineScreen() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

  return (
    <View style={styles.wrap}>
      <PlaceholderScreen
        title="我的"
        subtitle={`登录状态：${isAuthenticated ? "已登录（骨架）" : "未登录"}。后续按「我的」PRD 完善资料与设置。`}
      />
      <Link href="/login" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>打开登录页</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  button: {
    position: "absolute",
    left: lightTokens.space.lg,
    bottom: 120,
    backgroundColor: lightTokens.color.brand,
    paddingHorizontal: lightTokens.space.lg,
    paddingVertical: lightTokens.space.md,
    borderRadius: lightTokens.radius.md,
  },
  buttonText: {
    color: lightTokens.color.onBrand,
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
  },
});

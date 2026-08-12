import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { JiaowuLoginForm } from "@/modules/jiaowu/components/JiaowuLoginForm";
import { lightTokens } from "@/theme/tokens";

/**
 * 全局登录页：教务校验 → 档案 →（best-effort）农屿 Token
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + lightTokens.space.lg }]}>
      <JiaowuLoginForm
        onSuccess={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)/home");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: lightTokens.space.lg,
    paddingBottom: lightTokens.space.xl,
    backgroundColor: lightTokens.color.brandMuted,
  },
});

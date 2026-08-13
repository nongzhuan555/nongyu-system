import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightTokens } from "@/theme/tokens";

type ProfileHeaderProps = {
  /** 点击设置齿轮 */
  onPressSettings: () => void;
  /** 未登录时可不展示设置 */
  showSettings?: boolean;
};

/**
 * 「我的」顶栏：标题 + 设置入口
 */
export function ProfileHeader({ onPressSettings, showSettings = true }: ProfileHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>我的</Text>
      {showSettings ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="设置"
          hitSlop={10}
          onPress={onPressSettings}
          style={styles.settingsBtn}
        >
          <Ionicons name="settings-outline" size={24} color={lightTokens.color.text} />
        </Pressable>
      ) : (
        <View style={styles.settingsPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: lightTokens.space.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: lightTokens.color.text,
    letterSpacing: 0.3,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: lightTokens.radius.full,
  },
  settingsPlaceholder: {
    width: 40,
    height: 40,
  },
});

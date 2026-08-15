import { useThemeTokens } from "@/theme/ThemeProvider";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createThemedStyles } from "@/theme/createThemedStyles";

type ProfileHeaderProps = {
  onPressSettings: () => void;
  showSettings?: boolean;
};

/**
 * 「我的」顶栏：标题 + 设置
 */
export function ProfileHeader({ onPressSettings, showSettings = true }: ProfileHeaderProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  return (
    <View style={styles.row}>
      <Text style={styles.title}>我的</Text>
      {showSettings ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="设置"
          hitSlop={10}
          onPress={onPressSettings}
          style={({ pressed }) => [styles.settingsBtn, pressed && styles.settingsPressed]}
        >
          <Ionicons name="settings-outline" size={22} color={t.color.text} />
        </Pressable>
      ) : (
        <View style={styles.settingsPlaceholder} />
      )}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: t.space.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: t.color.text,
    letterSpacing: 0.2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  settingsPressed: {
    backgroundColor: t.color.brandMuted,
  },
  settingsPlaceholder: {
    width: 40,
    height: 40,
  },
}));

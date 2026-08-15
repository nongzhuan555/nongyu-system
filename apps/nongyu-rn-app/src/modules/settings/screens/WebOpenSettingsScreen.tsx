import { useThemeTokens } from "@/theme/ThemeProvider";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SettingsPageShell } from "../components/SettingsPageShell";
import { useAppWebPrefsStore } from "../store/appWebPrefsStore";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 网页跳转：应用内打开 vs 系统浏览器
 */
export function WebOpenSettingsScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const openWebInApp = useAppWebPrefsStore((s) => s.openWebInApp);
  const setOpenWebInApp = useAppWebPrefsStore((s) => s.setOpenWebInApp);

  return (
    <SettingsPageShell title="网页跳转">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + t.space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>打开方式</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.textCol}>
              <Text style={styles.title}>在应用内打开网页</Text>
              <Text style={styles.desc}>
                {openWebInApp
                  ? "常用网站与关于农屿将在农屿内的网页页中打开"
                  : "将使用系统浏览器打开链接"}
              </Text>
            </View>
            <Switch
              value={openWebInApp}
              onValueChange={setOpenWebInApp}
              trackColor={{
                false: t.color.border,
                true: t.color.brandMuted,
              }}
              thumbColor={openWebInApp ? t.color.brand : t.color.surface}
              accessibilityLabel="在应用内打开网页"
            />
          </View>
        </View>
        <Text style={styles.hint}>
          关闭后，链接会跳转到手机自带的浏览器。开启则为农屿内自建网页页（WebView）。更改立即生效。
        </Text>
      </ScrollView>
    </SettingsPageShell>
  );
}

const useStyles = createThemedStyles((t) => ({
  content: {
    paddingTop: t.space.sm,
  },
  sectionTitle: {
    marginBottom: 10,
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "700",
    color: t.color.textSecondary,
  },
  card: {
    borderRadius: t.radius.md,
    backgroundColor: t.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: t.space.md,
    gap: 12,
  },
  textCol: {
    flex: 1,
    paddingRight: t.space.sm,
  },
  title: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
  },
  desc: {
    marginTop: 4,
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 18,
  },
  hint: {
    marginTop: t.space.md,
    marginHorizontal: 4,
    fontSize: 12,
    lineHeight: 18,
    color: t.color.textSecondary,
  },
}));

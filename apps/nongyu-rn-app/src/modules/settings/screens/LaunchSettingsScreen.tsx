import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SettingsPageShell } from "../components/SettingsPageShell";
import { useAppLaunchPrefsStore, type LaunchTab } from "../store/appLaunchPrefsStore";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { toast } from "@/components/ui/toast";

const OPTIONS: { id: LaunchTab; label: string; hint: string }[] = [
  { id: "home", label: "首页", hint: "打开 App 后进入首页" },
  { id: "course", label: "课表", hint: "打开 App 后进入课表" },
];

/**
 * 启动页：进入主栈时默认落在首页或课表
 */
export function LaunchSettingsScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const t = useThemeTokens();
  const launchTab = useAppLaunchPrefsStore((s) => s.launchTab);
  const setLaunchTab = useAppLaunchPrefsStore((s) => s.setLaunchTab);

  const onSelect = (id: LaunchTab, label: string) => {
    if (id === launchTab) return;
    try {
      setLaunchTab(id);
      toast.success(`启动页已设为${label}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "请稍后重试";
      toast.error("设置启动页失败", { description: msg });
    }
  };

  return (
    <SettingsPageShell title="启动页">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + t.space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>打开 App 后进入</Text>
        <View style={styles.card}>
          {OPTIONS.map((opt, index) => {
            const selected = launchTab === opt.id;
            return (
              <View key={opt.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onSelect(opt.id, opt.label)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.textCol}>
                    <Text style={styles.rowTitle}>{opt.label}</Text>
                    <Text style={styles.rowDesc}>{opt.hint}</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioOn]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
        <Text style={styles.hint}>
          更改立即生效并保存在本机；下次登录或冷启动进入主页时生效。退出登录不会重置。
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
  pressed: {
    opacity: 0.72,
  },
  textCol: {
    flex: 1,
    paddingRight: t.space.sm,
  },
  rowTitle: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
  },
  rowDesc: {
    marginTop: 4,
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 18,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: t.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: {
    borderColor: t.color.brand,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: t.color.brand,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
    marginLeft: t.space.md,
  },
  hint: {
    marginTop: t.space.md,
    marginHorizontal: 4,
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 18,
  },
}));

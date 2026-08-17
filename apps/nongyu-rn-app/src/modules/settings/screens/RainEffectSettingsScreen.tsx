import { useThemeTokens } from "@/theme/ThemeProvider";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SettingsPageShell } from "../components/SettingsPageShell";
import { useRainPrefsStore } from "../store/rainPrefsStore";
import { useCampusWeatherStore } from "@/modules/weather/campusWeatherStore";
import { useSessionStore } from "@/stores/session";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { toast } from "@/components/ui/toast";

/**
 * 下雨特效：用户开关 + 校区天气
 */
export function RainEffectSettingsScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const rainEnabled = useRainPrefsStore((s) => s.rainEnabled);
  const setRainEnabled = useRainPrefsStore((s) => s.setRainEnabled);
  const status = useCampusWeatherStore((s) => s.status);
  const campusLabel = useCampusWeatherStore((s) => s.campusLabel);
  const isRaining = useCampusWeatherStore((s) => s.isRaining);
  const weatherCode = useCampusWeatherStore((s) => s.weatherCode);
  const errorMessage = useCampusWeatherStore((s) => s.errorMessage);
  const refreshFromProfile = useCampusWeatherStore((s) => s.refreshFromProfile);

  const weatherLine = (() => {
    if (status === "idle" || status === "loading") return "正在获取校区天气…";
    if (status === "error") return errorMessage ?? "天气获取失败（可稍后重试）";
    const rainText = isRaining ? "当前为雨类天气，可显示雨效" : "当前非雨天，不显示雨效";
    const codeText = weatherCode !== null ? `（代码 ${weatherCode}）` : "";
    return `${campusLabel ?? "校区"} · ${rainText}${codeText}`;
  })();

  const onToggle = (next: boolean) => {
    if (next === rainEnabled) return;
    try {
      setRainEnabled(next);
      const profile = useSessionStore.getState().profile;
      if (profile) {
        void refreshFromProfile(profile);
      }
      toast.success(next ? "已开启下雨特效（随校区天气）" : "已关闭下雨特效");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "请稍后重试";
      toast.error("设置失败", { description: msg });
    }
  };

  return (
    <SettingsPageShell title="下雨特效">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + t.space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>氛围效果</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.textCol}>
              <Text style={styles.title}>按天气显示下雨</Text>
              <Text style={styles.desc}>
                {rainEnabled
                  ? "开启后，仅当校区天气为雨时在全局叠加雨丝（不拦截点击）"
                  : "关闭后不渲染雨效"}
              </Text>
            </View>
            <Switch
              value={rainEnabled}
              onValueChange={onToggle}
              trackColor={{
                false: t.color.border,
                true: t.color.brandMuted,
              }}
              thumbColor={rainEnabled ? t.color.brand : t.color.surface}
              accessibilityLabel="按天气显示下雨特效"
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, styles.sectionGap]}>校区天气</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>{weatherLine}</Text>
          </View>
        </View>

        <Text style={styles.hint}>
          根据学院所在校区（雅安、成都或都江堰）的实时天气情况模拟下雨效果。雨是雅安的特色，本功能旨在让你同步感受雨城的风情。注意：开启后部分低配机型可能会出现较明显的卡顿，请按需使用，如果还想要更多有趣的功能欢迎反馈
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
  sectionGap: {
    marginTop: t.space.lg,
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
  infoRow: {
    paddingVertical: 14,
    paddingHorizontal: t.space.md,
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
  infoText: {
    fontSize: t.fontSize.sm,
    color: t.color.text,
    lineHeight: 20,
  },
  hint: {
    marginTop: t.space.md,
    marginHorizontal: 4,
    fontSize: 12,
    lineHeight: 18,
    color: t.color.textSecondary,
  },
}));

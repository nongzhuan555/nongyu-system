import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SettingsPageShell } from "../components/SettingsPageShell";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { useThemePrefsStore, type ThemeAppearance } from "@/theme/themePrefsStore";
import type { BrandName } from "@/theme/palettes";
import { brandPalettes } from "@/theme/palettes";

const THEME_SUGGEST_HREF =
  `/center/compose?postType=feedback&subtype=suggestion&title=${encodeURIComponent("App主题建议")}` as Href;

const BRAND_OPTIONS: { id: BrandName; label: string }[] = [
  { id: "green", label: "川农新绿" },
  { id: "sakura", label: "樱花浅粉" },
];

const APPEARANCE_OPTIONS: { id: ThemeAppearance; label: string; hint: string }[] = [
  { id: "light", label: "浅色", hint: "始终浅色界面" },
  { id: "dark", label: "暗色", hint: "始终暗色界面" },
  { id: "system", label: "跟随系统", hint: "随系统深浅色切换" },
];

/**
 * 主题与外观：品牌色（仅浅色生效）+ 明暗模式
 */
export function ThemeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const brand = useThemePrefsStore((s) => s.brand);
  const appearance = useThemePrefsStore((s) => s.appearance);
  const setBrand = useThemePrefsStore((s) => s.setBrand);
  const setAppearance = useThemePrefsStore((s) => s.setAppearance);
  const brandLocked = appearance === "dark";

  return (
    <SettingsPageShell title="主题与外观">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + t.space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>品牌色</Text>
        <View style={[styles.card, brandLocked && styles.cardMuted]}>
          {BRAND_OPTIONS.map((opt, index) => {
            const selected = brand === opt.id;
            const swatch = brandPalettes[opt.id].primary;
            return (
              <View key={opt.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: brandLocked }}
                  disabled={brandLocked}
                  onPress={() => setBrand(opt.id)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && !brandLocked && styles.pressed,
                    brandLocked && styles.rowDisabled,
                  ]}
                >
                  <View style={[styles.swatch, { backgroundColor: swatch }]} />
                  <Text style={styles.brandLabel}>{opt.label}</Text>
                  <View style={[styles.radio, selected && styles.radioOn]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
        <Text style={styles.brandHint}>
          {brandLocked
            ? "当前为暗色外观：使用统一深色配色，不区分绿/粉；切回浅色或跟随系统后品牌色才会生效。"
            : "品牌色仅在浅色界面生效；暗色（含跟随系统且系统为暗色）固定为统一深色配色。"}
        </Text>

        <Text style={[styles.sectionTitle, styles.sectionGap]}>外观</Text>
        <View style={styles.card}>
          {APPEARANCE_OPTIONS.map((opt, index) => {
            const selected = appearance === opt.id;
            return (
              <View key={opt.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setAppearance(opt.id)}
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="想要其他主题"
          onPress={() => router.push(THEME_SUGGEST_HREF)}
          style={({ pressed }) => [styles.suggestBtn, pressed && styles.pressed]}
        >
          <Text style={styles.suggestBtnText}>想要其他主题可点击此处提出建议</Text>
        </Pressable>

        <Text style={styles.hint}>主题更改后立即生效并保存在本机；退出登录不会重置主题。</Text>
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
  cardMuted: {
    opacity: 0.72,
  },
  brandHint: {
    marginTop: 8,
    marginHorizontal: 4,
    marginBottom: 2,
    fontSize: 12,
    lineHeight: 18,
    color: t.color.textSecondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: t.space.md,
    gap: 12,
  },
  rowDisabled: {
    opacity: 0.85,
  },
  pressed: {
    opacity: 0.88,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
    marginLeft: t.space.md,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  textCol: {
    flex: 1,
  },
  rowTitle: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
  },
  brandLabel: {
    flex: 1,
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
  suggestBtn: {
    alignSelf: "flex-start",
    marginTop: t.space.lg,
    marginLeft: 4,
    paddingVertical: 8,
    paddingRight: 8,
  },
  suggestBtnText: {
    fontSize: t.fontSize.sm,
    fontWeight: "600",
    color: t.color.brand,
  },
  hint: {
    marginTop: t.space.md,
    marginHorizontal: 4,
    fontSize: 12,
    lineHeight: 18,
    color: t.color.textSecondary,
  },
}));

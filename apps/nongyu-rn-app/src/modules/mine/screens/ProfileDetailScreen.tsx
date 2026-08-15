import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SettingsPageShell } from "@/modules/settings/components/SettingsPageShell";
import { PROFILE_DETAIL_FIELDS, profileFieldValue } from "@/modules/mine/profileFields";
import { useSessionStore } from "@/stores/session";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useThemeTokens } from "@/theme/ThemeProvider";

/**
 * 个人信息详情：只读本地会话档案（登录时拉取并持久化，登出清空）
 */
export function ProfileDetailScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const profile = useSessionStore((s) => s.profile);

  if (!profile) {
    return (
      <SettingsPageShell title="个人信息">
        <View style={styles.empty}>
          <Text style={styles.emptyText}>暂无档案信息</Text>
        </View>
      </SettingsPageShell>
    );
  }

  return (
    <SettingsPageShell title="个人信息">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + t.space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {PROFILE_DETAIL_FIELDS.map((field, index) => (
            <View key={String(field.key)}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.row}>
                <Text style={styles.label}>{field.label}</Text>
                <Text style={styles.value} selectable>
                  {profileFieldValue(profile, field.key)}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.hint}>
          信息来自登录时教务同步的本地档案；登出后清除。农屿不支持在此修改。
        </Text>
      </ScrollView>
    </SettingsPageShell>
  );
}

const useStyles = createThemedStyles((t) => ({
  content: {
    paddingTop: t.space.sm,
  },
  empty: {
    paddingTop: t.space.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: t.fontSize.md,
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
    paddingVertical: 14,
    paddingHorizontal: t.space.md,
    gap: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
    marginLeft: t.space.md,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: t.color.textSecondary,
    letterSpacing: 0.4,
  },
  value: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
    lineHeight: 22,
  },
  hint: {
    marginTop: t.space.md,
    marginHorizontal: 4,
    fontSize: 12,
    lineHeight: 18,
    color: t.color.textSecondary,
  },
}));

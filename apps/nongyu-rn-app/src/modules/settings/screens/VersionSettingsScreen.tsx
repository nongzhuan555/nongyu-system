import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Application from "expo-application";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUpdate } from "react-native-update";
import { toast } from "@/components/ui/toast";
import { isPushyUpdateEnabled } from "@/modules/update";
import { SettingsPageShell } from "../components/SettingsPageShell";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useThemeTokens } from "@/theme/ThemeProvider";

/**
 * 展示用应用版本（原生壳）
 */
function resolveAppVersionLabel(): string {
  return Application.nativeApplicationVersion?.trim() || "未知";
}

/**
 * 展示用构建号（Android versionCode / iOS buildNumber）
 */
function resolveBuildLabel(): string {
  return Application.nativeBuildVersion?.trim() || "未知";
}

/**
 * 热更包标识：无 hash 视为仍在基准包
 */
function formatHotUpdateLabel(currentHash: string | undefined): string {
  const hash = currentHash?.trim();
  if (!hash) return "基准包";
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

/**
 * 无 Pushy Provider 时的版本页（仅本地版本信息）
 */
function VersionSettingsWithoutPushy() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const t = useThemeTokens();

  return (
    <SettingsPageShell title="版本">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + t.space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <VersionInfoCard
          appVersion={resolveAppVersionLabel()}
          buildNumber={resolveBuildLabel()}
          hotUpdateLabel="未启用热更新"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="检查更新"
          onPress={() => toast.info("当前环境未启用热更新")}
          style={({ pressed }) => [styles.checkBtn, pressed && styles.pressed]}
        >
          <Text style={styles.checkBtnText}>检查更新</Text>
        </Pressable>
        <Text style={styles.hint}>
          请在 update.json 配置对应平台的 appKey 后使用正式壳验证热更。
        </Text>
      </ScrollView>
    </SettingsPageShell>
  );
}

type VersionInfoCardProps = {
  appVersion: string;
  buildNumber: string;
  hotUpdateLabel: string;
};

/**
 * 版本信息卡片
 */
function VersionInfoCard({ appVersion, buildNumber, hotUpdateLabel }: VersionInfoCardProps) {
  const styles = useStyles();
  return (
    <>
      <Text style={styles.sectionTitle}>当前版本</Text>
      <View style={styles.card}>
        <InfoRow label="应用版本" value={appVersion} />
        <View style={styles.divider} />
        <InfoRow label="构建号" value={buildNumber} />
        <View style={styles.divider} />
        <InfoRow label="热更新" value={hotUpdateLabel} />
      </View>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/**
 * 已挂载 UpdateProvider 时的版本页（可手动 checkUpdate）
 */
function VersionSettingsWithPushy() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const t = useThemeTokens();
  const { checkUpdate, currentHash, packageVersion } = useUpdate();
  const [checking, setChecking] = useState(false);

  const appVersion = resolveAppVersionLabel();
  const buildNumber = resolveBuildLabel();
  const hotUpdateLabel = formatHotUpdateLabel(currentHash);
  // packageVersion 为 Pushy 侧原生壳版本，与展示版并列时作补充说明
  const packageHint = packageVersion?.trim() ? `原生包标识：${packageVersion}` : null;

  const handleCheck = async () => {
    if (checking) return;
    if (__DEV__) {
      toast.info("开发环境默认不检查热更新，请使用正式包验证");
      return;
    }
    setChecking(true);
    try {
      const info = await checkUpdate();
      if (!info) {
        toast.error("检查失败，请稍后重试");
        return;
      }
      if (info.upToDate) {
        toast.success("已是最新版本");
        return;
      }
      if (info.expired) {
        // 有 downloadUrl 时 Provider 会弹出系统引导；此处仅补充 Toast
        toast.info(
          info.downloadUrl?.trim()
            ? "当前安装包已过期，请按提示安装新版本"
            : "当前安装包已过期，请前往分发渠道安装新版本",
        );
        return;
      }
      if (info.update) {
        toast.success("已下载更新，下次启动后生效");
        return;
      }
      toast.info("暂无可用更新");
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : "检查失败，请稍后重试";
      toast.error(message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <SettingsPageShell title="版本">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + t.space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <VersionInfoCard
          appVersion={appVersion}
          buildNumber={buildNumber}
          hotUpdateLabel={hotUpdateLabel}
        />
        {packageHint ? <Text style={styles.packageHint}>{packageHint}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="检查更新"
          disabled={checking}
          onPress={() => void handleCheck()}
          style={({ pressed }) => [
            styles.checkBtn,
            checking && styles.checkBtnDisabled,
            pressed && !checking && styles.pressed,
          ]}
        >
          {checking ? (
            <ActivityIndicator color={t.color.onBrand} />
          ) : (
            <Text style={styles.checkBtnText}>检查更新</Text>
          )}
        </Pressable>
        <Text style={styles.hint}>
          热更新默认静默下载，下次完全退出后再打开 App 生效。从后台回到前台也会自动检查。
        </Text>
      </ScrollView>
    </SettingsPageShell>
  );
}

/**
 * 设置 · 版本：查看当前版本并主动检查更新
 */
export function VersionSettingsScreen() {
  if (!isPushyUpdateEnabled) {
    return <VersionSettingsWithoutPushy />;
  }
  return <VersionSettingsWithPushy />;
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
    justifyContent: "space-between",
    gap: t.space.md,
    paddingHorizontal: t.space.md,
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: t.fontSize.md,
    color: t.color.textSecondary,
    textAlign: "right",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
    marginLeft: t.space.md,
  },
  packageHint: {
    marginTop: 8,
    marginHorizontal: 4,
    fontSize: 12,
    color: t.color.textSecondary,
  },
  checkBtn: {
    marginTop: t.space.lg,
    minHeight: 48,
    borderRadius: t.radius.md,
    backgroundColor: t.color.brand,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.space.md,
  },
  checkBtnDisabled: {
    opacity: 0.7,
  },
  checkBtnText: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.onBrand,
  },
  pressed: {
    opacity: 0.88,
  },
  hint: {
    marginTop: t.space.md,
    marginHorizontal: 4,
    fontSize: 13,
    lineHeight: 18,
    color: t.color.textSecondary,
  },
}));

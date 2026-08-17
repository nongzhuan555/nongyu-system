import { useThemeTokens } from "@/theme/ThemeProvider";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { takePendingAdminHandoffTicket } from "@/modules/mine/data/pendingAdminHandoff";
import { createThemedStyles } from "@/theme/createThemedStyles";

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * 将 handoff ticket 注入为 window 字段（文档加载前执行）
 */
function buildHandoffInjectScript(ticket: string): string {
  return `window.__NONGYU_ADMIN_HANDOFF_TICKET__=${JSON.stringify(ticket)};true;`;
}

/**
 * 应用内网页：顶栏 + WebView（「网页跳转 · 应用内打开」）
 * 管理台 handoff：从短时槽取 ticket，经 injectedJavaScriptBeforeContentLoaded 注入（永不进 URL）
 */
export function InAppWebViewerScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ url?: string | string[]; title?: string | string[] }>();
  /** 仅首屏文档加载显示遮罩，避免 SPA 二次导航把白底盖死 */
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const handoffTicketRef = useRef<string | null>(null);

  const url = useMemo(() => {
    const raw = firstParam(params.url);
    if (!raw) return "";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.url]);

  if (handoffTicketRef.current === null && url) {
    handoffTicketRef.current = takePendingAdminHandoffTicket(url);
  }

  const title = useMemo(() => {
    const raw = firstParam(params.title).trim();
    if (!raw) return "网页";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.title]);

  const injectedBeforeContentLoaded = handoffTicketRef.current
    ? buildHandoffInjectScript(handoffTicketRef.current)
    : undefined;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={t.color.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {!url ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>无效链接</Text>
        </View>
      ) : (
        <View style={styles.webWrap}>
          {initialLoading ? (
            <View style={styles.loading} pointerEvents="none">
              <ActivityIndicator color={t.color.brand} />
            </View>
          ) : null}
          {loadError && !initialLoading ? (
            <View style={styles.errorBanner} pointerEvents="none">
              <Text style={styles.errorBannerText}>{loadError}</Text>
            </View>
          ) : null}
          <WebView
            source={{ uri: url }}
            style={styles.web}
            onLoadEnd={() => setInitialLoading(false)}
            onError={() => {
              setInitialLoading(false);
              setLoadError("页面加载失败，请返回重试");
            }}
            onHttpError={() => {
              setInitialLoading(false);
              setLoadError("页面响应异常，请返回重试");
            }}
            startInLoadingState={false}
            allowsBackForwardNavigationGestures
            domStorageEnabled
            javaScriptEnabled
            injectedJavaScriptBeforeContentLoaded={injectedBeforeContentLoaded}
          />
        </View>
      )}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space.sm,
    paddingVertical: t.space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.color.border,
    backgroundColor: t.color.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
    letterSpacing: 0.2,
  },
  headerRight: {
    width: 40,
  },
  webWrap: {
    flex: 1,
  },
  web: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
  errorBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: t.color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.color.border,
  },
  errorBannerText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    textAlign: "center",
  },
}));

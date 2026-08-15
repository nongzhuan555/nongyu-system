import { useThemeTokens } from "@/theme/ThemeProvider";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { createThemedStyles } from "@/theme/createThemedStyles";

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * 应用内网页：顶栏 + WebView（「网页跳转 · 应用内打开」）
 */
export function InAppWebViewerScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ url?: string | string[]; title?: string | string[] }>();
  const [loading, setLoading] = useState(true);

  const url = useMemo(() => {
    const raw = firstParam(params.url);
    if (!raw) return "";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.url]);

  const title = useMemo(() => {
    const raw = firstParam(params.title).trim();
    if (!raw) return "网页";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.title]);

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
          {loading ? (
            <View style={styles.loading} pointerEvents="none">
              <ActivityIndicator color={t.color.brand} />
            </View>
          ) : null}
          <WebView
            source={{ uri: url }}
            style={styles.web}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => setLoading(false)}
            startInLoadingState
            allowsBackForwardNavigationGestures
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
}));

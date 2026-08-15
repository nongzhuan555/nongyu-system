import { useThemeTokens } from "@/theme/ThemeProvider";
import { useCallback, useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TabScreenBackground } from "@/components/navigation/TabScreenBackground";
import { ScrollToTopFab, useScrollToTopVisibility } from "@/components/ui/ScrollToTopFab";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { JiaowuListSkeleton } from "./JiaowuListSkeleton";
import { JiaowuErrorView } from "./JiaowuErrorView";
import { JiaowuEmptyView } from "./JiaowuEmptyView";

export type JiaowuPageSearchProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** 假延时模拟联网搜索中 */
  searching?: boolean;
};

type JiaowuPageShellProps = {
  title: string;
  children?: ReactNode;
  /** 首次无数据加载 */
  loading?: boolean;
  /** 无数据且失败 */
  error?: boolean;
  /** 失败页文案（如超时校园网提示） */
  errorMessage?: string;
  /** 成功但空列表 */
  empty?: boolean;
  emptyText?: string;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** 后台刷新中的轻量提示 */
  fetchingHint?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** 自定义顶栏右侧 */
  headerRight?: ReactNode;
  /** 传入则展示本地搜索条（加载/错误态不展示） */
  search?: JiaowuPageSearchProps;
};

/**
 * 教务子页壳：渐变背景 + 顶栏返回 + 可选搜索 + RefreshControl + 骨架/失败/空/内容
 */
export function JiaowuPageShell({
  title,
  children,
  loading,
  error,
  errorMessage,
  empty,
  emptyText,
  onRetry,
  refreshing,
  onRefresh,
  fetchingHint,
  contentStyle,
  headerRight,
  search,
}: JiaowuPageShellProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { visible: showScrollTop, onScroll: onScrollTopVisibility } = useScrollToTopVisibility();

  const onPressScrollTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    onRefresh?.();
  }, [onRefresh]);

  let body: ReactNode = children;
  if (loading) {
    body = <JiaowuListSkeleton />;
  } else if (error) {
    body = <JiaowuErrorView onRetry={onRetry} message={errorMessage} />;
  } else if (empty) {
    body = <JiaowuEmptyView text={emptyText} />;
  }

  const showSearch = !!search && !loading && !error;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TabScreenBackground />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={t.color.brand} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerRight}>{headerRight}</View>
      </View>

      {fetchingHint ? (
        <View style={styles.fetchingBar}>
          <ActivityIndicator size="small" color={t.color.brand} />
          <Text style={styles.fetchingText}>更新中…</Text>
        </View>
      ) : null}

      {showSearch && search ? (
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={t.color.textSecondary} />
            <TextInput
              value={search.value}
              onChangeText={search.onChangeText}
              placeholder={search.placeholder}
              placeholderTextColor={t.color.textSecondary}
              accessibilityLabel={search.placeholder}
              returnKeyType="search"
              maxLength={64}
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
            {search.searching ? <ActivityIndicator size="small" color={t.color.brand} /> : null}
            {search.value.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="清空搜索"
                hitSlop={8}
                onPress={() => search.onChangeText("")}
              >
                <Ionicons name="close-circle" size={16} color={t.color.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.listHost}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          onScroll={onScrollTopVisibility}
          scrollEventThrottle={16}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={t.color.brand}
                colors={[t.color.brand]}
              />
            ) : undefined
          }
        >
          {body}
        </ScrollView>
        <ScrollToTopFab visible={showScrollTop} onPress={onPressScrollTop} placement="stack" />
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space.sm,
    paddingVertical: t.space.sm,
    minHeight: 48,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: t.fontSize.lg,
    fontWeight: "700",
    color: t.color.brand,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  fetchingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 4,
  },
  fetchingText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
  searchWrap: {
    paddingHorizontal: t.space.md,
    marginBottom: t.space.sm,
  },
  listHost: {
    flex: 1,
  },
  searchBox: {
    height: 40,
    borderRadius: t.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: t.fontSize.sm,
    color: t.color.text,
    paddingVertical: 0,
  },
  content: {
    paddingHorizontal: t.space.md,
    paddingBottom: t.space.xl,
    flexGrow: 1,
  },
}));

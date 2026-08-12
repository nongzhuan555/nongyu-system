import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { lightTokens } from "@/theme/tokens";
import { JiaowuListSkeleton } from "./JiaowuListSkeleton";
import { JiaowuErrorView } from "./JiaowuErrorView";
import { JiaowuEmptyView } from "./JiaowuEmptyView";

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
};

/**
 * 教务子页壳：顶栏返回 + RefreshControl + 骨架/失败/空/内容
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
}: JiaowuPageShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  let body: ReactNode = children;
  if (loading) {
    body = <JiaowuListSkeleton />;
  } else if (error) {
    body = <JiaowuErrorView onRetry={onRetry} message={errorMessage} />;
  } else if (empty) {
    body = <JiaowuEmptyView text={emptyText} />;
  }

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
          <Ionicons name="chevron-back" size={22} color={lightTokens.color.brand} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerRight}>{headerRight}</View>
      </View>

      {fetchingHint ? (
        <View style={styles.fetchingBar}>
          <ActivityIndicator size="small" color={lightTokens.color.brand} />
          <Text style={styles.fetchingText}>更新中…</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={lightTokens.color.brand}
              colors={[lightTokens.color.brand]}
            />
          ) : undefined
        }
      >
        {body}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: lightTokens.color.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: lightTokens.space.sm,
    paddingVertical: lightTokens.space.sm,
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
    fontSize: lightTokens.fontSize.lg,
    fontWeight: "700",
    color: lightTokens.color.brand,
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
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
  },
  content: {
    paddingHorizontal: lightTokens.space.md,
    paddingBottom: lightTokens.space.xl,
    flexGrow: 1,
  },
});

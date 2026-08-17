import { useThemeTokens } from "@/theme/ThemeProvider";
import { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { useSharedValue } from "react-native-reanimated";
import { ScrollToTopFab, useScrollToTopVisibility } from "@/components/ui/ScrollToTopFab";
import {
  fetchMyPosts,
  fetchPosts,
  type PostListItem,
  type PostType,
} from "@/modules/center/api/posts";
import { ensureAppAccessToken } from "@/api/ensureAppAuth";
import { FadeScrollItem } from "@/modules/center/components/FadeScrollItem";
import { PostCard } from "@/modules/center/components/PostCard";
import { PostListSkeleton } from "@/modules/center/components/PostListSkeleton";
import { tabBarContentPadding } from "@/modules/center/utils/format";
import { createThemedStyles } from "@/theme/createThemedStyles";

const MISSING_TOKEN_HINT = "农屿服务未接通或登录凭证缺失";

type PostFeedListProps = {
  mode: "plaza" | "mine";
  postType?: PostType;
  /** 广场关键词（title/content LIKE）；我的帖子忽略 */
  keyword?: string;
  /** 广场 Tab 需要底栏留白；Stack 子页用安全区即可由外层处理 */
  withTabBarPadding?: boolean;
  emptyText?: string;
};

/**
 * 广场 / 我的帖子无限滚动列表（顶部滚出卡片渐隐）
 */
export function PostFeedList({
  mode,
  postType,
  keyword,
  withTabBarPadding,
  emptyText = "暂无内容",
}: PostFeedListProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const listHostRef = useRef<View>(null);
  const listRef = useRef<FlashListRef<PostListItem>>(null);
  const scrollY = useSharedValue(0);
  const listPageY = useSharedValue(0);
  const isScrolling = useSharedValue(0);
  const { visible: showScrollTop, onScroll: onScrollTopVisibility } = useScrollToTopVisibility();
  const trimmedKeyword = keyword?.trim() || undefined;

  const queryKey =
    mode === "mine"
      ? (["posts", "me"] as const)
      : (["posts", "list", postType ?? "announcement", trimmedKeyword ?? ""] as const);

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    enabled: mode === "mine" || !!postType,
    queryFn: async ({ pageParam }) => {
      if (mode === "mine") {
        return fetchMyPosts({ page: pageParam, pageSize: 20 });
      }
      return fetchPosts({
        postType: postType!,
        page: pageParam,
        pageSize: 20,
        keyword: trimmedKeyword,
      });
    },
    getNextPageParam: (last) => {
      const loaded = last.page * last.pageSize;
      return loaded < last.total ? last.page + 1 : undefined;
    },
  });

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.list) ?? [], [query.data?.pages]);

  const bottomPad = withTabBarPadding ? tabBarContentPadding() : t.space.xl;

  const syncListPageY = () => {
    listHostRef.current?.measureInWindow((_x, y) => {
      listPageY.value = y;
    });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.value = e.nativeEvent.contentOffset.y;
    onScrollTopVisibility(e);
  };

  const onPressScrollTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    void query.refetch();
  }, [query.refetch]);

  /** 无票时先补签发再拉列表 */
  const onRetry = useCallback(async () => {
    await ensureAppAccessToken();
    await query.refetch();
  }, [query.refetch]);

  const onScrollBegin = () => {
    isScrolling.value = 1;
  };

  /** 松手时若还有惯性，等 onMomentumScrollEnd；否则立刻结束滑动态 */
  const onScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const vy = e.nativeEvent.velocity?.y ?? 0;
    if (Math.abs(vy) < 0.03) {
      isScrolling.value = 0;
    }
  };

  const onMomentumScrollEnd = () => {
    isScrolling.value = 0;
  };

  if (query.isPending && items.length === 0) {
    return (
      <View style={[styles.stateWrap, { paddingBottom: bottomPad }]}>
        <PostListSkeleton />
      </View>
    );
  }

  if (query.isError && items.length === 0) {
    const raw = query.error instanceof Error ? query.error.message : "加载失败";
    const message =
      raw.includes("登录凭证") || raw.includes("联调 Token") ? MISSING_TOKEN_HINT : raw;
    return (
      <View style={[styles.stateWrap, styles.centered, { paddingBottom: bottomPad }]}>
        <Text style={styles.errorText}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void onRetry()}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View ref={listHostRef} style={styles.listRoot} onLayout={syncListPageY} collapsable={false}>
      <FlashList
        ref={listRef}
        data={items}
        keyExtractor={(item: PostListItem) => String(item.id)}
        contentContainerStyle={{
          paddingHorizontal: t.space.md,
          paddingTop: t.space.xs,
          paddingBottom: bottomPad,
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }: { item: PostListItem }) => (
          <FadeScrollItem scrollY={scrollY} listPageY={listPageY} isScrolling={isScrolling}>
            <PostCard
              item={item}
              showViewCount={mode === "mine"}
              onPress={() => router.push(`/center/post/${item.id}` as Href)}
            />
          </FadeScrollItem>
        )}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBegin}
        onMomentumScrollBegin={onScrollBegin}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void onRetry()}
            tintColor={t.color.brand}
          />
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={t.color.brand} />
            </View>
          ) : !query.hasNextPage && items.length > 0 ? (
            <Text style={styles.endHint}>没有更多了</Text>
          ) : null
        }
      />
      <ScrollToTopFab
        visible={showScrollTop}
        onPress={onPressScrollTop}
        placement={withTabBarPadding ? "tab" : "stack"}
      />
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  listRoot: {
    flex: 1,
  },
  stateWrap: {
    flex: 1,
    paddingHorizontal: t.space.md,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: t.space.md,
  },
  sep: {
    height: t.space.sm,
  },
  errorText: {
    fontSize: t.fontSize.sm,
    color: t.color.danger,
    textAlign: "center",
    paddingHorizontal: t.space.lg,
  },
  retryBtn: {
    paddingHorizontal: t.space.lg,
    paddingVertical: 10,
    borderRadius: t.radius.full,
    backgroundColor: t.color.brand,
  },
  retryText: {
    color: t.color.onBrand,
    fontWeight: "600",
    fontSize: t.fontSize.sm,
  },
  empty: {
    paddingTop: 64,
    alignItems: "center",
  },
  emptyText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    letterSpacing: 0.2,
  },
  footer: {
    paddingVertical: t.space.md,
  },
  endHint: {
    textAlign: "center",
    paddingVertical: t.space.lg,
    fontSize: 12,
    color: t.color.textSecondary,
    opacity: 0.7,
  },
}));

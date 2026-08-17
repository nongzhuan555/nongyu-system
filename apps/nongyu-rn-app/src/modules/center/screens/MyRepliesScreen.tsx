import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { confirm } from "@/components/ui/confirm";
import { toast } from "@/components/ui/toast";
import { ensureAppAccessToken } from "@/api/ensureAppAuth";
import {
  deleteComment,
  fetchReceivedPostReplies,
  fetchSentPostReplies,
  type MyPostReplyListItem,
} from "@/modules/center/api/postReplies";
import { MyReplyListItem } from "@/modules/center/components/MyReplyListItem";
import { PostListSkeleton } from "@/modules/center/components/PostListSkeleton";
import { SettingsPageShell } from "@/modules/settings/components/SettingsPageShell";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useThemeTokens } from "@/theme/ThemeProvider";

type TabKey = "received" | "sent";

/**
 * 留言与回复：双 Tab（收到的 / 我发出的）
 */
export function MyRepliesScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("received");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const queryKey = useMemo(() => ["posts", "me", "replies", tab] as const, [tab]);

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = { page: pageParam, pageSize: 20 };
      return tab === "received" ? fetchReceivedPostReplies(params) : fetchSentPostReplies(params);
    },
    getNextPageParam: (last) => {
      const loaded = last.page * last.pageSize;
      return loaded < last.total ? last.page + 1 : undefined;
    },
  });

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.list) ?? [], [query.data?.pages]);

  const onRetry = useCallback(async () => {
    await ensureAppAccessToken();
    await query.refetch();
  }, [query.refetch]);

  const openPost = (postId: number) => {
    router.push(`/center/post/${postId}` as Href);
  };

  const onDelete = async (item: MyPostReplyListItem) => {
    const ok = await confirm({
      title: "删除留言",
      message: "确定删除这条留言？",
      confirmText: "删除",
      destructive: true,
    });
    if (!ok) return;
    setDeletingId(item.replyId);
    try {
      await deleteComment(item.postId, item.replyId);
      toast.success("已删除");
      await queryClient.invalidateQueries({ queryKey: ["posts", "me", "replies", "sent"] });
      await queryClient.invalidateQueries({ queryKey: ["posts", "detail", item.postId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "删除失败";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const emptyText = tab === "received" ? "还没有收到回复" : "你还没有留言";
  const emptyHint =
    tab === "received" ? "别人回复你的帖子后会显示在这里" : "你在大院给他人留言后会出现在这里";

  return (
    <SettingsPageShell title="留言与回复">
      <View style={styles.tabs}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "received" }}
          onPress={() => setTab("received")}
          style={[styles.tab, tab === "received" && styles.tabActive]}
        >
          <Ionicons
            name="mail-unread-outline"
            size={15}
            color={tab === "received" ? t.color.onBrand : t.color.textSecondary}
          />
          <Text style={[styles.tabText, tab === "received" && styles.tabTextActive]}>收到的</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "sent" }}
          onPress={() => setTab("sent")}
          style={[styles.tab, tab === "sent" && styles.tabActive]}
        >
          <Ionicons
            name="create-outline"
            size={15}
            color={tab === "sent" ? t.color.onBrand : t.color.textSecondary}
          />
          <Text style={[styles.tabText, tab === "sent" && styles.tabTextActive]}>我发出的</Text>
        </Pressable>
      </View>

      {query.isPending && items.length === 0 ? (
        <View style={styles.stateWrap}>
          <PostListSkeleton />
        </View>
      ) : query.isError && items.length === 0 ? (
        <View style={[styles.stateWrap, styles.centered]}>
          <Text style={styles.errorText}>
            {query.error instanceof Error ? query.error.message : "加载失败"}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onRetry()}
            style={styles.retryBtn}
          >
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.listRoot}>
          <FlashList
            data={items}
            keyExtractor={(item: MyPostReplyListItem) => String(item.replyId)}
            contentContainerStyle={{
              paddingTop: t.space.sm,
              paddingBottom: insets.bottom + t.space.xl,
            }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }: { item: MyPostReplyListItem }) => (
              <MyReplyListItem
                item={item}
                showDelete={tab === "sent"}
                deleting={deletingId === item.replyId}
                onPress={() => openPost(item.postId)}
                onDelete={
                  tab === "sent"
                    ? () => {
                        void onDelete(item);
                      }
                    : undefined
                }
              />
            )}
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
                <View style={styles.emptyIcon}>
                  <Ionicons name="chatbubbles-outline" size={28} color={t.color.brand} />
                </View>
                <Text style={styles.emptyText}>{emptyText}</Text>
                <Text style={styles.emptyHint}>{emptyHint}</Text>
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
        </View>
      )}
    </SettingsPageShell>
  );
}

const useStyles = createThemedStyles((t) => ({
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: t.space.xs,
    padding: 4,
    borderRadius: t.radius.full,
    backgroundColor: t.color.surface,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: t.radius.full,
  },
  tabActive: {
    backgroundColor: t.color.brand,
  },
  tabText: {
    fontSize: t.fontSize.sm,
    fontWeight: "600",
    color: t.color.textSecondary,
  },
  tabTextActive: {
    color: t.color.onBrand,
  },
  listRoot: {
    flex: 1,
  },
  sep: {
    height: t.space.sm,
  },
  stateWrap: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: t.space.md,
  },
  errorText: {
    fontSize: t.fontSize.sm,
    color: t.color.danger,
    textAlign: "center",
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
    paddingTop: 72,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: t.space.lg,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.brandMuted,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
  },
  emptyHint: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    textAlign: "center",
    lineHeight: 20,
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

import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "@/components/ui/toast";
import { deletePost, fetchPostDetail } from "@/modules/center/api/posts";
import { PostDetailSkeleton } from "@/modules/center/components/PostDetailSkeleton";
import { subtypeLabel } from "@/modules/center/constants/subtypes";
import { formatPublishedAt, stripHtml } from "@/modules/center/utils/format";
import { lightTokens } from "@/theme/tokens";

/**
 * 帖子详情：打开即计阅读；本人可删
 */
export function PostDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["posts", "detail", id],
    enabled: Number.isFinite(id) && id > 0,
    queryFn: () => fetchPostDetail(id),
  });

  const remove = useMutation({
    mutationFn: () => deletePost(id),
    onSuccess: async () => {
      toast.success("已删除");
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      router.back();
    },
    onError: (err: Error) => {
      toast.error("删除失败", { description: err.message });
    },
  });

  const onDelete = () => {
    Alert.alert("删除帖子", "删除后不可恢复，确定删除？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => remove.mutate(),
      },
    ]);
  };

  const post = query.data;

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
          <Ionicons name="chevron-back" size={22} color={lightTokens.color.text} />
        </Pressable>
        <View style={styles.headerCenter} />
        {post?.isMine && post.postType !== "announcement" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="删除"
            onPress={onDelete}
            disabled={remove.isPending}
            hitSlop={8}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteText}>删除</Text>
          </Pressable>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + lightTokens.space.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {query.isPending ? (
          <PostDetailSkeleton />
        ) : query.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {query.error instanceof Error ? query.error.message : "加载失败"}
            </Text>
            <Pressable onPress={() => void query.refetch()} style={styles.retryBtn}>
              <Text style={styles.retryText}>重试</Text>
            </Pressable>
          </View>
        ) : post ? (
          <>
            <Text style={styles.title}>{post.title}</Text>
            <Text style={styles.meta}>
              {[
                formatPublishedAt(post.publishedAt),
                subtypeLabel(post.postType, post.subtype),
                post.postType === "courtyard" && post.authorDisplayName
                  ? post.authorDisplayName
                  : null,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </Text>
            <View style={styles.rule} />
            <Text style={styles.body}>{stripHtml(post.content)}</Text>
          </>
        ) : null}
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
    paddingVertical: lightTokens.space.xs,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  deleteBtn: {
    minWidth: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  deleteText: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.danger,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: lightTokens.space.lg,
    paddingTop: lightTokens.space.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: lightTokens.color.text,
    lineHeight: 32,
    letterSpacing: 0.2,
  },
  meta: {
    marginTop: lightTokens.space.md,
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
    letterSpacing: 0.15,
  },
  rule: {
    marginTop: lightTokens.space.lg,
    marginBottom: lightTokens.space.lg,
    height: StyleSheet.hairlineWidth,
    backgroundColor: lightTokens.color.border,
  },
  body: {
    fontSize: lightTokens.fontSize.md,
    color: lightTokens.color.text,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  errorBox: {
    gap: lightTokens.space.md,
    alignItems: "center",
    paddingTop: 48,
  },
  errorText: {
    color: lightTokens.color.danger,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: lightTokens.space.lg,
    paddingVertical: 10,
    borderRadius: lightTokens.radius.full,
    backgroundColor: lightTokens.color.brand,
  },
  retryText: {
    color: lightTokens.color.onBrand,
    fontWeight: "600",
  },
});

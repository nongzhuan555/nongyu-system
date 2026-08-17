import { useThemeTokens } from "@/theme/ThemeProvider";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";
import { deletePost, fetchPostDetail, type PostComment } from "@/modules/center/api/posts";
import { createComment, deleteComment } from "@/modules/center/api/postReplies";
import { AdminReplyBlock } from "@/modules/center/components/AdminReplyBlock";
import { CommentComposer } from "@/modules/center/components/CommentComposer";
import { CommentList } from "@/modules/center/components/CommentList";
import { PostDetailSkeleton } from "@/modules/center/components/PostDetailSkeleton";
import { subtypeLabel } from "@/modules/center/constants/subtypes";
import { formatPublishedAt, stripHtml } from "@/modules/center/utils/format";
import { trackClick } from "@/modules/telemetry";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 帖子详情：打开即计阅读；本人可删；反馈墙展示管理员回复；大院支持留言。
 */
export function PostDetailScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const detailKey = ["posts", "detail", id] as const;

  const query = useQuery({
    queryKey: detailKey,
    enabled: Number.isFinite(id) && id > 0,
    queryFn: () => fetchPostDetail(id),
    // 进入即拉新（轮询会置位 notified_author，但详情本身要最新）
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
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

  // 留言创建：乐观追加临时项，失败回滚
  const addComment = useMutation({
    mutationFn: (content: string) => createComment(id, { content }),
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<PostComment[] | undefined>(detailKey);
      const post = queryClient.getQueryData<{ id: number; comments?: PostComment[] }>(detailKey);
      if (post) {
        const temp: PostComment = {
          id: -Date.now(),
          content,
          publishedAt: new Date().toISOString(),
          isMine: true,
        };
        queryClient.setQueryData(detailKey, {
          ...post,
          comments: [...(post.comments ?? []), temp],
        });
      }
      return { previous };
    },
    onError: (err: Error, _content, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(detailKey, ctx.previous);
      toast.error("留言失败", { description: err.message });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: detailKey });
      toast.success("留言成功");
    },
  });

  // 留言删除：乐观移除，失败回滚
  const removeComment = useMutation({
    mutationFn: (commentId: number) => deleteComment(id, commentId),
    onMutate: async (commentId: number) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<PostComment[] | undefined>(detailKey);
      const post = queryClient.getQueryData<{ id: number; comments?: PostComment[] }>(detailKey);
      if (post?.comments) {
        queryClient.setQueryData(detailKey, {
          ...post,
          comments: post.comments.filter((c) => c.id !== commentId),
        });
      }
      return { previous };
    },
    onError: (err: Error, _commentId, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(detailKey, ctx.previous);
      toast.error("删除失败", { description: err.message });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: detailKey });
    },
  });

  const onDelete = async () => {
    const ok = await confirm({
      title: "删除帖子",
      message: "删除后不可恢复，确定删除？",
      confirmText: "删除",
      destructive: true,
    });
    if (!ok) return;
    trackClick("center_post_delete");
    remove.mutate();
  };

  const onDeleteComment = async (commentId: number) => {
    const ok = await confirm({
      title: "删除留言",
      message: "确定删除这条留言？",
      confirmText: "删除",
      destructive: true,
    });
    if (!ok) return;
    trackClick("center_comment_delete");
    removeComment.mutate(commentId);
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
          <Ionicons name="chevron-back" size={22} color={t.color.text} />
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

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + t.space.xl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                ].join("  ·  ")}
              </Text>
              <View style={styles.rule} />
              <Text style={styles.body}>{stripHtml(post.content)}</Text>

              {post.postType === "feedback" ? (
                <AdminReplyBlock reply={post.adminReply} />
              ) : post.postType === "courtyard" ? (
                <View style={styles.commentsSection}>
                  <Text style={styles.sectionTitle}>
                    留言 {post.comments?.length ? `(${post.comments.length})` : ""}
                  </Text>
                  <CommentList comments={post.comments} onDelete={onDeleteComment} />
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        {post?.postType === "courtyard" ? (
          <CommentComposer pending={addComment.isPending} onPost={(c) => addComment.mutate(c)} />
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space.sm,
    paddingVertical: t.space.xs,
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
    fontSize: t.fontSize.sm,
    color: t.color.danger,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: t.color.text,
    lineHeight: 32,
    letterSpacing: 0.2,
  },
  meta: {
    marginTop: t.space.md,
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    letterSpacing: 0.15,
  },
  rule: {
    marginTop: t.space.lg,
    marginBottom: t.space.lg,
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
  },
  body: {
    fontSize: t.fontSize.md,
    color: t.color.text,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  errorBox: {
    gap: t.space.md,
    alignItems: "center",
    paddingTop: 48,
  },
  errorText: {
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
  },
  commentsSection: {
    marginTop: t.space.xl,
    gap: t.space.sm,
  },
  sectionTitle: {
    fontSize: t.fontSize.sm,
    fontWeight: "700",
    color: t.color.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
}));

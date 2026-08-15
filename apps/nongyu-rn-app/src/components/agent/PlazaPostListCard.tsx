import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import type { PageResult, PostListItem, PostType } from "@/modules/center/api/posts";
import { PostCard } from "@/modules/center/components/PostCard";
import type { ToolRenderProps } from "@/agent-ui/registry";
import { createThemedStyles } from "@/theme/createThemedStyles";

/** 与 plazaTools.PLAZA_AGENT_LIST_LIMIT 对齐 */
const LIST_LIMIT = 5;

type PlazaListArgs = {
  postType: PostType;
  keyword?: string;
  subtype?: string;
  page?: number;
};

const POST_TYPE_LABEL: Record<PostType, string> = {
  announcement: "公告",
  feedback: "反馈墙",
  courtyard: "大院",
};

/**
 * 广场帖子列表：Agent 内联纵向卡片（复用 PostCard）
 */
function PlazaPostListCardInner({
  args,
  output,
  status,
  error,
}: ToolRenderProps<PlazaListArgs, PageResult<PostListItem>>) {
  const styles = useStyles();
  const router = useRouter();
  const zone = POST_TYPE_LABEL[args?.postType] ?? "广场";

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询广场帖子失败"}</Text>
      </View>
    );
  }

  const list = output.list ?? [];
  if (list.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>
          暂无{zone}帖子
          {args?.keyword ? `（关键词：${args.keyword}）` : ""}
        </Text>
      </View>
    );
  }

  const shown = list.slice(0, LIST_LIMIT);
  const hasMore = output.total > shown.length;

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>{zone}</Text>
      <View style={styles.list}>
        {shown.map((item) => (
          <PostCard
            key={item.id}
            item={item}
            onPress={() => router.push(`/center/post/${item.id}` as Href)}
          />
        ))}
      </View>
      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="去广场查看更多"
          style={styles.moreBtn}
          onPress={() => router.push("/(tabs)/center" as Href)}
        >
          <Text style={styles.moreText}>去广场查看更多 ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const PlazaPostListCard = memo(PlazaPostListCardInner);

const useStyles = createThemedStyles((t) => ({
  root: {
    width: "100%",
  },
  headerTitle: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
    marginBottom: t.space.sm,
  },
  list: {
    gap: t.space.sm,
  },
  card: {
    padding: t.space.md,
    borderRadius: t.radius.lg,
    backgroundColor: t.color.brandMuted,
  },
  errorCard: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  errorText: {
    fontSize: t.fontSize.sm,
    color: t.color.danger,
  },
  emptyCard: {
    backgroundColor: t.color.surfaceVariant,
  },
  emptyText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    textAlign: "center",
  },
  moreBtn: {
    alignSelf: "flex-start",
    marginTop: t.space.sm,
    paddingHorizontal: t.space.sm,
    paddingVertical: t.space.xs,
    borderRadius: t.radius.full,
    backgroundColor: t.color.brandMuted,
  },
  moreText: {
    fontSize: t.fontSize.sm,
    color: t.color.brand,
    fontWeight: "600",
  },
}));

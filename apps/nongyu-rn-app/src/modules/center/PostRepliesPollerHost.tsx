import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { useSessionStore } from "@/stores/session";
import { fetchNewPostReplies, type NewPostReply } from "@/modules/center/api/postReplies";
import { useForegroundState } from "@/modules/center/hooks/useForegroundState";

const POLL_INTERVAL_MS = 30_000;
const SEEN_SET_MAX = 200;

/**
 * 全局「我的新回复」轮询 Host。
 * 挂载于 AuthRoot 内：仅登录态 + 前台时以 30s 间隔轮询当前用户帖子下未通知的新回复。
 * 服务端返回后置位 notified_author；客户端 seenIdsRef 做幂等兜底，避免快速 refetch 重复 toast。
 * 新回复 toast 点击跳转对应帖子详情。
 */
export function PostRepliesPollerHost() {
  const isForeground = useForegroundState();
  const token = useSessionStore((s) => s.token);
  const hydrated = useSessionStore((s) => s.hydrated);
  const router = useRouter();
  const seenIdsRef = useRef<Set<number>>(new Set());

  const enabled = hydrated && Boolean(token);

  const query = useQuery({
    queryKey: ["posts", "me", "new-replies"],
    queryFn: fetchNewPostReplies,
    enabled,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: isForeground && enabled ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  // 数据变化时对 fresh 项触发 toast；seenIdsRef 保证每条只通知一次
  useEffect(() => {
    const data = query.data;
    if (!data || data.length === 0) return;
    const fresh = data.filter((r) => !seenIdsRef.current.has(r.replyId));
    if (fresh.length === 0) return;
    fresh.forEach((r: NewPostReply) => {
      seenIdsRef.current.add(r.replyId);
      const title = r.postTitle;
      const msg =
        r.kind === "admin_reply"
          ? `你的反馈帖《${title}》已被管理员回复`
          : `你的大院帖《${title}》收到新留言`;
      toast.info(msg, {
        onPress: () => router.push(`/center/post/${r.postId}`),
      });
    });
    // 防止集合无限增长：保留最近 SEEN_SET_MAX 条
    if (seenIdsRef.current.size > SEEN_SET_MAX) {
      const arr = [...seenIdsRef.current];
      seenIdsRef.current = new Set(arr.slice(-SEEN_SET_MAX));
    }
  }, [query.data, router]);

  return null;
}

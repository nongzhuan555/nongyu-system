import { useQuery } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { useSessionStore } from "@/stores/session";

export type JiaowuResource =
  | "notice"
  | "competition"
  | "progress"
  | "score"
  | "rank"
  | "exam"
  | "plan";

const STALE_MS: Record<JiaowuResource, number> = {
  notice: 3 * 60 * 1000,
  competition: 3 * 60 * 1000,
  exam: 10 * 60 * 1000,
  progress: 15 * 60 * 1000,
  score: 15 * 60 * 1000,
  rank: 15 * 60 * 1000,
  plan: 15 * 60 * 1000,
};

type ToolResult<T> = {
  success: boolean;
  result: T;
  message?: string;
};

type UseJiaowuQueryOptions<T> = {
  resource: JiaowuResource;
  queryFn: () => Promise<ToolResult<T>>;
  /** 需登录时未登录不发请求 */
  requireAuth?: boolean;
  staleTime?: number;
};

/**
 * 教务统一 Query：分资源 staleTime + 失败抛错 + 下拉刷新保留旧数据
 */
export function useJiaowuQuery<T>({
  resource,
  queryFn,
  requireAuth = false,
  staleTime,
}: UseJiaowuQueryOptions<T>) {
  const studentId = useSessionStore((s) => s.profile?.studentId);
  const enabled = requireAuth ? !!studentId : true;

  const query = useQuery({
    queryKey: requireAuth
      ? (["jiaowu", resource, studentId] as const)
      : (["jiaowu", resource] as const),
    enabled,
    staleTime: staleTime ?? STALE_MS[resource],
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const res = await queryFn();
      if (!res.success) {
        throw new Error(res.message || "教务数据获取失败");
      }
      return res.result;
    },
  });

  /**
   * 下拉刷新：有旧数据时失败仅 Toast，不切整页失败态
   */
  const refresh = async () => {
    try {
      await query.refetch({ throwOnError: true });
    } catch (err) {
      if (query.data !== undefined) {
        const detail = err instanceof Error && err.message ? err.message : "请稍后重试";
        Toast.show({
          type: "error",
          text1: "刷新失败",
          text2: `已保留上次数据。${detail}`,
        });
      }
    }
  };

  return {
    ...query,
    refresh,
    studentId,
  };
}

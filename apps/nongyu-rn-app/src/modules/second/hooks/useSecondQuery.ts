import { useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { useSecondAuth } from "@/modules/second/hooks/useSecondAuth";

type ToolResult<T> = {
  success: boolean;
  result: T;
  message?: string;
};

type UseSecondQueryOptions<T> = {
  resource: string;
  queryFn: () => Promise<ToolResult<T>>;
  requireAuth?: boolean;
  staleTime?: number;
};

/**
 * 二课 React Query 封装
 */
export function useSecondQuery<T>({
  resource,
  queryFn,
  requireAuth = true,
  staleTime = 10 * 60 * 1000,
}: UseSecondQueryOptions<T>) {
  const { isSecondAuthed } = useSecondAuth();
  const enabled = requireAuth ? isSecondAuthed : true;

  const query = useQuery({
    queryKey: ["second", resource, isSecondAuthed] as const,
    enabled,
    staleTime,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async (): Promise<T> => {
      const res = await queryFn();
      if (!res.success) {
        throw new Error(res.message || "二课数据获取失败");
      }
      return res.result;
    },
  });

  const refresh = async () => {
    try {
      await query.refetch({ throwOnError: true });
    } catch (err) {
      if (query.data !== undefined) {
        const detail = err instanceof Error && err.message ? err.message : "请稍后重试";
        toast.error("刷新失败", {
          description: `已保留上次数据。${detail}`,
        });
      }
    }
  };

  return { ...query, refresh, isSecondAuthed };
}

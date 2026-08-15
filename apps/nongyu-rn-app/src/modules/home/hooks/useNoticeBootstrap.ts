import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getAppAccessToken } from "@/api/appClient";
import { fetchLatestAnnouncement } from "@/modules/center/api/posts";
import { subtypeLabel } from "@/modules/center/constants/subtypes";
import { FIXED_NOTICE } from "@/modules/home/constants/social";
import { useSessionStore } from "@/stores/session";

export type NoticeData = {
  /** 真实公告 id；占位为 null */
  id: number | null;
  typeLabel: string;
  title: string;
  isPlaceholder: boolean;
};

/** 无数据时的显式占位 —— 保证首页通知栏 UI 不消失 */
const PLACEHOLDER_NOTICE: NoticeData = {
  id: null,
  typeLabel: FIXED_NOTICE.typeLabel,
  title: FIXED_NOTICE.title,
  isPlaceholder: true,
};

/**
 * 首页通知栏：拉最新一条公告；无 Token / 无数据 / 失败 → 占位文案
 * 依赖会话 hydrated + Token；回到首页会 refetch
 */
export function useNoticeBootstrap(): {
  loading: boolean;
  notice: NoticeData;
} {
  const hydrated = useSessionStore((s) => s.hydrated);
  const token = useSessionStore((s) => s.token);
  const canFetch = hydrated && Boolean(getAppAccessToken());

  const query = useQuery({
    queryKey: ["posts", "announcements", "latest", token ?? "none"],
    queryFn: fetchLatestAnnouncement,
    enabled: canFetch,
    staleTime: 60_000,
  });

  const { refetch } = query;

  useFocusEffect(
    useCallback(() => {
      if (!canFetch) return;
      void refetch();
    }, [canFetch, refetch]),
  );

  if (!canFetch) {
    return {
      loading: !hydrated,
      notice: PLACEHOLDER_NOTICE,
    };
  }

  if (query.isPending && !query.data && !query.isError) {
    return { loading: true, notice: PLACEHOLDER_NOTICE };
  }

  const latest = query.data;
  if (latest) {
    return {
      loading: false,
      notice: {
        id: latest.id,
        typeLabel: subtypeLabel("announcement", latest.subtype),
        title: latest.title,
        isPlaceholder: false,
      },
    };
  }

  return { loading: false, notice: PLACEHOLDER_NOTICE };
}

import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getAppAccessToken } from "@/api/appClient";
import { fetchHomeGreeting } from "@/modules/home/api/greeting";
import {
  DEFAULT_GREETING_MESSAGE,
  buildGreetingLead,
  composeGreetingFullText,
} from "@/modules/home/constants/greeting";
import { useSessionStore } from "@/stores/session";

/**
 * 首页打招呼：拉运营第二句；未登录/失败/无数据 → 本地兜底；齐备后再撤骨架打字
 */
export function useGreetingBootstrap(): {
  loading: boolean;
  fullText: string;
} {
  const hydrated = useSessionStore((s) => s.hydrated);
  const token = useSessionStore((s) => s.token);
  const name = useSessionStore((s) => s.profile?.name);
  const canFetch = hydrated && Boolean(getAppAccessToken());

  const query = useQuery({
    queryKey: ["home", "greeting", token ?? "none"],
    queryFn: fetchHomeGreeting,
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

  const lead = buildGreetingLead(name);
  const remote = query.data?.message?.trim();
  const second = remote || DEFAULT_GREETING_MESSAGE;
  const fullText = composeGreetingFullText(lead, second);

  if (!hydrated) {
    return { loading: true, fullText };
  }

  if (!canFetch) {
    return { loading: false, fullText };
  }

  if (query.isPending && !query.data && !query.isError) {
    return { loading: true, fullText };
  }

  return { loading: false, fullText };
}

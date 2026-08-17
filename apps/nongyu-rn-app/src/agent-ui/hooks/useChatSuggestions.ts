import { useQuery } from "@tanstack/react-query";
import { getAppAccessToken } from "@/api/appClient";
import { fetchAgentChatSuggestions } from "@/agent-ui/api/chatSuggestions";
import { useSessionStore } from "@/stores/session";

/** 与历史硬编码一致；接口失败/空列表时兜底 */
export const DEFAULT_CHAT_SUGGESTIONS = [
  "查一下我的成绩",
  "本周有哪些二课活动",
  "看看我的课表",
  "帮我改成深色主题",
] as const;

export type ChatSuggestionChip = {
  key: string;
  text: string;
};

const DEFAULT_CHIPS: ChatSuggestionChip[] = DEFAULT_CHAT_SUGGESTIONS.map((text, index) => ({
  key: `local-${index}`,
  text,
}));

/**
 * 空态快捷建议：拉运营配置；未登录/失败/空 → 本地兜底
 */
export function useChatSuggestions(): {
  loading: boolean;
  suggestions: ChatSuggestionChip[];
} {
  const hydrated = useSessionStore((s) => s.hydrated);
  const token = useSessionStore((s) => s.token);
  const canFetch = hydrated && Boolean(getAppAccessToken());

  const query = useQuery({
    queryKey: ["agent", "chat-suggestions", token ?? "none"],
    queryFn: fetchAgentChatSuggestions,
    enabled: canFetch,
    staleTime: 60_000,
  });

  if (!hydrated) {
    return { loading: true, suggestions: DEFAULT_CHIPS };
  }

  if (!canFetch) {
    return { loading: false, suggestions: DEFAULT_CHIPS };
  }

  if (query.isPending && !query.data && !query.isError) {
    return { loading: true, suggestions: DEFAULT_CHIPS };
  }

  const remote = (query.data?.items ?? [])
    .map((item) => {
      const text = item.text?.trim();
      if (!text) return null;
      return { key: `remote-${item.id}`, text };
    })
    .filter((item): item is ChatSuggestionChip => item != null);

  return {
    loading: false,
    suggestions: remote.length > 0 ? remote : DEFAULT_CHIPS,
  };
}

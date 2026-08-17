import { appFetch } from "@/api/appClient";

export type AgentChatSuggestionItem = {
  id: number;
  text: string;
};

export type AgentChatSuggestionsPayload = {
  items: AgentChatSuggestionItem[];
};

/**
 * GET /api/app/agent/chat-suggestions —— 空态启用建议（最多 6）
 */
export async function fetchAgentChatSuggestions(): Promise<AgentChatSuggestionsPayload> {
  return appFetch<AgentChatSuggestionsPayload>("/api/app/agent/chat-suggestions", {
    method: "GET",
  });
}

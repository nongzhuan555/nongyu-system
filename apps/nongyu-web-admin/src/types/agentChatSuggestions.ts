export type AdminAgentChatSuggestionItem = {
  id: number;
  text: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminAgentChatSuggestionListQuery = {
  page?: number;
  pageSize?: number;
  /** 0 禁用 / 1 启用；不传为全部 */
  enabled?: 0 | 1;
};

export type CreateAgentChatSuggestionBody = {
  text: string;
  enabled?: boolean;
  sortOrder?: number;
};

export type PatchAgentChatSuggestionBody = {
  text?: string;
  enabled?: boolean;
  sortOrder?: number;
};

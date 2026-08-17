export type AdminHomeGreetingItem = {
  id: number;
  message: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminHomeGreetingListQuery = {
  page?: number;
  pageSize?: number;
  /** 0 禁用 / 1 启用；不传为全部 */
  enabled?: 0 | 1;
};

export type CreateHomeGreetingBody = {
  message: string;
  enabled?: boolean;
};

export type PatchHomeGreetingBody = {
  message?: string;
  enabled?: boolean;
};

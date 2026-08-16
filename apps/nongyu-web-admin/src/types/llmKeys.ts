export type LlmKeyStatus = 0 | 1;

export type AdminLlmKeyItem = {
  id: number;
  name: string;
  provider: string;
  accountGroup: string;
  apiKeySuffix: string;
  baseUrl: string | null;
  model: string | null;
  maxConcurrent: number;
  weight: number;
  status: LlmKeyStatus;
  successCount: number;
  failCount: number;
  lastUsedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  inFlight?: number;
  cooling?: boolean;
  cooldownUntil?: string | null;
};

export type AdminLlmKeyListQuery = {
  page?: number;
  pageSize?: number;
  status?: LlmKeyStatus;
  accountGroup?: string;
};

export type CreateLlmKeyBody = {
  name: string;
  accountGroup: string;
  apiKey: string;
  provider?: string;
  baseUrl?: string | null;
  model?: string | null;
  maxConcurrent?: number;
  weight?: number;
  status?: LlmKeyStatus;
};

export type PatchLlmKeyBody = {
  name?: string;
  accountGroup?: string;
  apiKey?: string;
  baseUrl?: string | null;
  model?: string | null;
  maxConcurrent?: number;
  weight?: number;
  status?: LlmKeyStatus;
};

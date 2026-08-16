import { toIsoUtc, toIsoUtcRequired } from "../../lib/time.js";
import type { LlmApiKeyRow } from "./repo.js";

export type LlmKeyAdminDto = {
  id: number;
  name: string;
  provider: string;
  accountGroup: string;
  apiKeySuffix: string;
  baseUrl: string | null;
  model: string | null;
  maxConcurrent: number;
  weight: number;
  status: 0 | 1;
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

export function toLlmKeyAdminDto(
  row: LlmApiKeyRow,
  runtime?: { inFlight: number; cooling: boolean; cooldownUntil: string | null },
): LlmKeyAdminDto {
  return {
    id: Number(row.id),
    name: row.name,
    provider: row.provider,
    accountGroup: row.account_group,
    apiKeySuffix: row.api_key_suffix,
    baseUrl: row.base_url,
    model: row.model,
    maxConcurrent: row.max_concurrent,
    weight: row.weight,
    status: row.status === 1 ? 1 : 0,
    successCount: Number(row.success_count),
    failCount: Number(row.fail_count),
    lastUsedAt: toIsoUtc(row.last_used_at),
    lastError: row.last_error,
    createdAt: toIsoUtcRequired(row.created_at),
    updatedAt: toIsoUtcRequired(row.updated_at),
    inFlight: runtime?.inFlight,
    cooling: runtime?.cooling,
    cooldownUntil: runtime?.cooldownUntil ?? null,
  };
}

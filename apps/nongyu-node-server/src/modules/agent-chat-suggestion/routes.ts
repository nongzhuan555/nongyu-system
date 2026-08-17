import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireAppAuth, requireProvisionedAdminAuth } from "../../middlewares/auth.js";
import { ok } from "../../lib/response.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { boolFromDb, pageParams } from "../../lib/util.js";
import { toIsoUtcRequired } from "../../lib/time.js";
import {
  deleteSuggestion,
  findSuggestionById,
  insertSuggestion,
  listEnabledSuggestionsForApp,
  listSuggestions,
  updateSuggestion,
} from "./repo.js";

export const appAgentChatSuggestionsRouter = Router();
export const adminAgentChatSuggestionsRouter = Router();

const textSchema = z.string().trim().min(1, "建议文案不能为空").max(24, "建议文案最多 24 字");
const sortOrderSchema = z.coerce.number().int().min(-9999).max(9999);

function toAdminDto(row: NonNullable<Awaited<ReturnType<typeof findSuggestionById>>>) {
  return {
    id: Number(row.id),
    text: row.text,
    enabled: boolFromDb(row.enabled),
    sortOrder: Number(row.sort_order),
    createdAt: toIsoUtcRequired(row.created_at),
    updatedAt: toIsoUtcRequired(row.updated_at),
  };
}

/** App：当前启用的空态建议（最多 6） */
appAgentChatSuggestionsRouter.get(
  "/",
  requireAppAuth,
  asyncHandler(async (_req, res) => {
    const rows = await listEnabledSuggestionsForApp(6);
    ok(res, {
      items: rows.map((row) => ({
        id: Number(row.id),
        text: row.text,
      })),
    });
  }),
);

adminAgentChatSuggestionsRouter.get(
  "/",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        enabled: z
          .union([z.literal("0"), z.literal("1"), z.literal(0), z.literal(1)])
          .optional()
          .transform((v) => (v === undefined ? undefined : v === 1 || v === "1")),
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
      })
      .parse(req.query);
    const { page, pageSize, offset } = pageParams(query.page, query.pageSize);
    const { rows, total } = await listSuggestions({
      enabled: query.enabled,
      offset,
      pageSize,
    });
    ok(res, {
      list: rows.map(toAdminDto),
      total,
      page,
      pageSize,
    });
  }),
);

adminAgentChatSuggestionsRouter.post(
  "/",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        text: textSchema,
        enabled: z.boolean().optional().default(false),
        sortOrder: sortOrderSchema.optional().default(0),
      })
      .parse(req.body);
    const id = await insertSuggestion({
      text: body.text,
      enabled: body.enabled,
      sortOrder: body.sortOrder,
    });
    ok(res, { id });
  }),
);

adminAgentChatSuggestionsRouter.patch(
  "/:id",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new AppError(ErrorCodes.VALIDATION, "id 无效", 400);
    }
    const existing = await findSuggestionById(id);
    if (!existing) {
      throw new AppError(ErrorCodes.AGENT_CHAT_SUGGESTION_NOT_FOUND, "建议不存在", 404);
    }
    const body = z
      .object({
        text: textSchema.optional(),
        enabled: z.boolean().optional(),
        sortOrder: sortOrderSchema.optional(),
      })
      .refine((v) => v.text !== undefined || v.enabled !== undefined || v.sortOrder !== undefined, {
        message: "至少提供 text、enabled 或 sortOrder",
      })
      .parse(req.body);
    await updateSuggestion(id, {
      text: body.text,
      enabled: body.enabled,
      sortOrder: body.sortOrder,
    });
    ok(res, { id });
  }),
);

adminAgentChatSuggestionsRouter.delete(
  "/:id",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new AppError(ErrorCodes.VALIDATION, "id 无效", 400);
    }
    const existing = await findSuggestionById(id);
    if (!existing) {
      throw new AppError(ErrorCodes.AGENT_CHAT_SUGGESTION_NOT_FOUND, "建议不存在", 404);
    }
    await deleteSuggestion(id);
    ok(res, null);
  }),
);

import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireProvisionedAdminAuth } from "../../middlewares/auth.js";
import { ok } from "../../lib/response.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { pageParams } from "../../lib/util.js";
import { encryptApiKey, suffixOf } from "./crypto.js";
import { toLlmKeyAdminDto } from "./mapper.js";
import { deleteLlmKey, findLlmKeyById, insertLlmKey, listLlmKeys, updateLlmKey } from "./repo.js";
import { keyPoolScheduler } from "./scheduler.js";

export const adminLlmKeysRouter = Router();

adminLlmKeysRouter.get(
  "/",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        status: z.coerce.number().int().min(0).max(1).optional(),
        accountGroup: z.string().min(1).max(64).optional(),
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
      })
      .parse(req.query);
    const { page, pageSize, offset } = pageParams(query.page, query.pageSize);
    const { rows, total } = await listLlmKeys({
      status: query.status,
      accountGroup: query.accountGroup,
      offset,
      pageSize,
    });
    ok(res, {
      list: rows.map((row) =>
        toLlmKeyAdminDto(row, keyPoolScheduler.getRuntimeSnapshot(Number(row.id))),
      ),
      total,
      page,
      pageSize,
    });
  }),
);

adminLlmKeysRouter.post(
  "/",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1).max(64),
        accountGroup: z.string().min(1).max(64),
        apiKey: z.string().min(1).max(512),
        provider: z.string().min(1).max(32).default("zhipu"),
        baseUrl: z
          .string()
          .max(255)
          .nullable()
          .optional()
          .transform((v) => {
            if (v == null) return null;
            const t = v.trim().replace(/\/+$/, "");
            return t || null;
          }),
        model: z
          .string()
          .max(64)
          .nullable()
          .optional()
          .transform((v) => {
            if (v == null) return null;
            const t = v.trim();
            return t || null;
          }),
        maxConcurrent: z.number().int().min(1).max(32).default(1),
        weight: z.number().int().min(1).max(100).default(1),
        status: z.union([z.literal(0), z.literal(1)]).default(1),
      })
      .parse(req.body);

    const plain = body.apiKey.trim();
    const id = await insertLlmKey({
      name: body.name.trim(),
      provider: body.provider,
      accountGroup: body.accountGroup.trim(),
      apiKeyCipher: encryptApiKey(plain),
      apiKeySuffix: suffixOf(plain),
      baseUrl: body.baseUrl ?? null,
      model: body.model ?? null,
      maxConcurrent: body.maxConcurrent,
      weight: body.weight,
      status: body.status,
    });
    keyPoolScheduler.invalidateCache();
    const row = await findLlmKeyById(id);
    if (!row) throw new AppError(ErrorCodes.INTERNAL, "创建失败", 500);
    ok(res, toLlmKeyAdminDto(row, keyPoolScheduler.getRuntimeSnapshot(id)));
  }),
);

adminLlmKeysRouter.patch(
  "/:id",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new AppError(ErrorCodes.VALIDATION, "id 无效", 400);
    }
    const existing = await findLlmKeyById(id);
    if (!existing) throw new AppError(ErrorCodes.LLM_KEY_NOT_FOUND, "密钥不存在", 404);

    const body = z
      .object({
        name: z.string().min(1).max(64).optional(),
        accountGroup: z.string().min(1).max(64).optional(),
        apiKey: z.string().min(1).max(512).optional(),
        baseUrl: z
          .string()
          .max(255)
          .nullable()
          .optional()
          .transform((v) => {
            if (v === undefined) return undefined;
            if (v == null) return null;
            const t = v.trim().replace(/\/+$/, "");
            return t || null;
          }),
        model: z
          .string()
          .max(64)
          .nullable()
          .optional()
          .transform((v) => {
            if (v === undefined) return undefined;
            if (v == null) return null;
            const t = v.trim();
            return t || null;
          }),
        maxConcurrent: z.number().int().min(1).max(32).optional(),
        weight: z.number().int().min(1).max(100).optional(),
        status: z.union([z.literal(0), z.literal(1)]).optional(),
      })
      .parse(req.body);

    const patch: Parameters<typeof updateLlmKey>[1] = {};
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.accountGroup !== undefined) patch.accountGroup = body.accountGroup.trim();
    if (body.baseUrl !== undefined) patch.baseUrl = body.baseUrl;
    if (body.model !== undefined) patch.model = body.model;
    if (body.maxConcurrent !== undefined) patch.maxConcurrent = body.maxConcurrent;
    if (body.weight !== undefined) patch.weight = body.weight;
    if (body.status !== undefined) patch.status = body.status;
    if (body.apiKey !== undefined) {
      const plain = body.apiKey.trim();
      patch.apiKeyCipher = encryptApiKey(plain);
      patch.apiKeySuffix = suffixOf(plain);
    }

    await updateLlmKey(id, patch);
    keyPoolScheduler.invalidateCache();
    const updated = await findLlmKeyById(id);
    ok(res, toLlmKeyAdminDto(updated!, keyPoolScheduler.getRuntimeSnapshot(id)));
  }),
);

adminLlmKeysRouter.delete(
  "/:id",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new AppError(ErrorCodes.VALIDATION, "id 无效", 400);
    }
    const existing = await findLlmKeyById(id);
    if (!existing) throw new AppError(ErrorCodes.LLM_KEY_NOT_FOUND, "密钥不存在", 404);
    await deleteLlmKey(id);
    keyPoolScheduler.dropKey(id);
    ok(res, null);
  }),
);

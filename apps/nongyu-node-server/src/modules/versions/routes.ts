import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireAdminAuth } from "../../middlewares/auth.js";
import { ok } from "../../lib/response.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { toIsoUtc, toIsoUtcRequired } from "../../lib/time.js";
import { boolFromDb, pageParams } from "../../lib/util.js";
import {
  findLatestPublished,
  findVersionById,
  insertVersion,
  listVersions,
  unpublishVersion,
  updateVersion,
} from "./repo.js";

export const appVersionsRouter = Router();
export const adminVersionsRouter = Router();

appVersionsRouter.get(
  "/check",
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        platform: z.enum(["ios", "android"]),
        versionCode: z.coerce.number().int(),
      })
      .parse(req.query);
    const latest = await findLatestPublished(query.platform);
    if (!latest || latest.version_code <= query.versionCode) {
      ok(res, {
        hasUpdate: false,
        forceUpdate: false,
        latest: null,
      });
      return;
    }
    ok(res, {
      hasUpdate: true,
      forceUpdate: boolFromDb(latest.force_update),
      latest: {
        versionName: latest.version_name,
        versionCode: latest.version_code,
        releaseChannel: latest.release_channel,
        downloadUrl: latest.download_url,
        changelog: latest.changelog,
      },
    });
  }),
);

function toAdminVersion(row: NonNullable<Awaited<ReturnType<typeof findVersionById>>>) {
  return {
    id: Number(row.id),
    platform: row.platform,
    versionName: row.version_name,
    versionCode: row.version_code,
    releaseChannel: row.release_channel,
    forceUpdate: boolFromDb(row.force_update),
    downloadUrl: row.download_url,
    changelog: row.changelog,
    isPublished: boolFromDb(row.is_published),
    publishedAt: toIsoUtc(row.published_at),
    createdAt: toIsoUtcRequired(row.created_at),
    updatedAt: toIsoUtcRequired(row.updated_at),
  };
}

adminVersionsRouter.get(
  "/",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        platform: z.enum(["ios", "android", "all"]).optional(),
        isPublished: z
          .union([z.literal("true"), z.literal("false"), z.boolean()])
          .optional()
          .transform((v) => (v === undefined ? undefined : v === true || v === "true")),
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
      })
      .parse(req.query);
    const { page, pageSize, offset } = pageParams(query.page, query.pageSize);
    const { rows, total } = await listVersions({
      platform: query.platform,
      isPublished: query.isPublished,
      offset,
      pageSize,
    });
    ok(res, {
      list: rows.map(toAdminVersion),
      total,
      page,
      pageSize,
    });
  }),
);

adminVersionsRouter.post(
  "/",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        platform: z.enum(["ios", "android", "all"]),
        versionName: z.string().min(1).max(32),
        versionCode: z.number().int().positive(),
        releaseChannel: z.enum(["silent_ota", "native"]),
        forceUpdate: z.boolean().default(false),
        downloadUrl: z.string().max(512).nullable().optional(),
        changelog: z.string().nullable().optional(),
        isPublished: z.boolean().optional().default(false),
      })
      .parse(req.body);
    const id = await insertVersion({
      platform: body.platform,
      versionName: body.versionName,
      versionCode: body.versionCode,
      releaseChannel: body.releaseChannel,
      forceUpdate: body.forceUpdate,
      downloadUrl: body.downloadUrl ?? null,
      changelog: body.changelog ?? null,
      isPublished: body.isPublished,
    });
    ok(res, { id });
  }),
);

adminVersionsRouter.patch(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await findVersionById(id);
    if (!existing) throw new AppError(ErrorCodes.VERSION_NOT_FOUND, "版本记录不存在", 404);
    const body = z
      .object({
        platform: z.enum(["ios", "android", "all"]).optional(),
        versionName: z.string().min(1).max(32).optional(),
        versionCode: z.number().int().positive().optional(),
        releaseChannel: z.enum(["silent_ota", "native"]).optional(),
        forceUpdate: z.boolean().optional(),
        downloadUrl: z.string().max(512).nullable().optional(),
        changelog: z.string().nullable().optional(),
        isPublished: z.boolean().optional(),
      })
      .parse(req.body);
    await updateVersion(id, body);
    const updated = await findVersionById(id);
    ok(res, toAdminVersion(updated!));
  }),
);

adminVersionsRouter.delete(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await findVersionById(id);
    if (!existing) throw new AppError(ErrorCodes.VERSION_NOT_FOUND, "版本记录不存在", 404);
    await unpublishVersion(id);
    ok(res, null);
  }),
);

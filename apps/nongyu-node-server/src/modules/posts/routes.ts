import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireAdminAuth, requireAppAuth } from "../../middlewares/auth.js";
import { ok } from "../../lib/response.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { toIsoUtc, toIsoUtcRequired } from "../../lib/time.js";
import { pageParams, previewText } from "../../lib/util.js";
import { countUsers } from "../users/repo.js";
import {
  findPostById,
  insertPost,
  latestAnnouncement,
  listPosts,
  recordPostRead,
  softDeletePost,
  updateAnnouncement,
} from "./repo.js";

export const appPostsRouter = Router();
export const adminPostsRouter = Router();

function appListItem(
  row: Awaited<ReturnType<typeof findPostById>>,
  opts?: { withViews?: boolean },
) {
  if (!row) return null;
  const base = {
    id: Number(row.id),
    postType: row.post_type,
    subtype: row.subtype,
    title: row.title,
    contentPreview: previewText(row.content),
    publishedAt: toIsoUtcRequired(row.published_at),
    authorDisplayName:
      row.post_type === "feedback"
        ? null
        : row.post_type === "courtyard"
          ? (row.author_name ?? null)
          : null,
  };
  if (opts?.withViews) {
    return { ...base, viewCount: row.view_count };
  }
  return base;
}

appPostsRouter.get(
  "/",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        postType: z.enum(["announcement", "feedback", "courtyard"]),
        subtype: z.string().optional(),
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
      })
      .parse(req.query);
    const { page, pageSize, offset } = pageParams(query.page, query.pageSize);
    const { rows, total } = await listPosts({
      postType: query.postType,
      subtype: query.subtype,
      offset,
      pageSize,
    });
    ok(res, {
      list: rows.map((r) => appListItem(r)),
      total,
      page,
      pageSize,
    });
  }),
);

appPostsRouter.get(
  "/announcements/latest",
  requireAppAuth,
  asyncHandler(async (_req, res) => {
    const row = await latestAnnouncement();
    if (!row) {
      ok(res, null);
      return;
    }
    ok(res, {
      id: Number(row.id),
      title: row.title,
      subtype: row.subtype,
      publishedAt: toIsoUtcRequired(row.published_at),
    });
  }),
);

appPostsRouter.get(
  "/:id",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const post = await findPostById(id);
    if (!post || post.deleted_at) {
      throw new AppError(ErrorCodes.POST_NOT_FOUND, "帖子不存在", 404);
    }
    await recordPostRead(id, req.appAuth!.uid);
    const refreshed = await findPostById(id);
    ok(res, {
      id: Number(refreshed!.id),
      postType: refreshed!.post_type,
      subtype: refreshed!.subtype,
      title: refreshed!.title,
      content: refreshed!.content,
      publishedAt: toIsoUtcRequired(refreshed!.published_at),
      authorDisplayName:
        refreshed!.post_type === "feedback"
          ? null
          : refreshed!.post_type === "courtyard"
            ? (refreshed!.author_name ?? null)
            : null,
      isMine: Number(refreshed!.author_user_id) === req.appAuth!.uid,
    });
  }),
);

appPostsRouter.post(
  "/",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        postType: z.enum(["feedback", "courtyard"]),
        subtype: z.string().min(1).max(32),
        title: z.string().min(1).max(200),
        content: z.string().min(1),
      })
      .parse(req.body);
    const id = await insertPost({
      postType: body.postType,
      subtype: body.subtype,
      title: body.title,
      content: body.content,
      authorUserId: req.appAuth!.uid,
    });
    ok(res, { id });
  }),
);

appPostsRouter.delete(
  "/:id",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const post = await findPostById(id);
    if (!post || post.deleted_at) {
      throw new AppError(ErrorCodes.POST_NOT_FOUND, "帖子不存在", 404);
    }
    if (post.post_type === "announcement" || Number(post.author_user_id) !== req.appAuth!.uid) {
      throw new AppError(ErrorCodes.ADMIN_REQUIRED, "无权删除该帖子", 403);
    }
    await softDeletePost(id);
    ok(res, null);
  }),
);

export const appMyPostsRouter = Router();

appMyPostsRouter.get(
  "/",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        postType: z.enum(["feedback", "courtyard"]).optional(),
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
      })
      .parse(req.query);
    const { page, pageSize, offset } = pageParams(query.page, query.pageSize);
    const { rows, total } = await listPosts({
      authorUserId: req.appAuth!.uid,
      postType: query.postType,
      postTypes: query.postType ? undefined : ["feedback", "courtyard"],
      offset,
      pageSize,
    });
    ok(res, {
      list: rows.map((r) => appListItem(r, { withViews: true })),
      total,
      page,
      pageSize,
    });
  }),
);

adminPostsRouter.get(
  "/",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        postType: z.enum(["announcement", "feedback", "courtyard"]).optional(),
        subtype: z.string().optional(),
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
        includeDeleted: z
          .union([z.literal("true"), z.literal("false"), z.boolean()])
          .optional()
          .transform((v) => v === true || v === "true"),
      })
      .parse(req.query);
    const { page, pageSize, offset } = pageParams(query.page, query.pageSize);
    const totalUsers = await countUsers();
    const { rows, total } = await listPosts({
      postType: query.postType,
      subtype: query.subtype,
      includeDeleted: query.includeDeleted,
      offset,
      pageSize,
    });
    ok(res, {
      list: rows.map((r) => ({
        id: Number(r.id),
        postType: r.post_type,
        subtype: r.subtype,
        title: r.title,
        content: r.content,
        authorUserId: Number(r.author_user_id),
        authorStudentNo: r.author_student_no ?? "",
        authorName: r.author_name ?? "",
        viewCount: r.view_count,
        uniqueReaderCount: r.unique_reader_count,
        coverageRate: totalUsers > 0 ? r.unique_reader_count / totalUsers : 0,
        publishedAt: toIsoUtcRequired(r.published_at),
        deletedAt: toIsoUtc(r.deleted_at),
      })),
      total,
      page,
      pageSize,
    });
  }),
);

adminPostsRouter.get(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const post = await findPostById(id);
    if (!post) throw new AppError(ErrorCodes.POST_NOT_FOUND, "帖子不存在", 404);
    const totalUsers = await countUsers();
    ok(res, {
      id: Number(post.id),
      postType: post.post_type,
      subtype: post.subtype,
      title: post.title,
      content: post.content,
      authorUserId: Number(post.author_user_id),
      authorStudentNo: post.author_student_no ?? "",
      authorName: post.author_name ?? "",
      viewCount: post.view_count,
      uniqueReaderCount: post.unique_reader_count,
      coverageRate: totalUsers > 0 ? post.unique_reader_count / totalUsers : 0,
      publishedAt: toIsoUtcRequired(post.published_at),
      deletedAt: toIsoUtc(post.deleted_at),
    });
  }),
);

adminPostsRouter.post(
  "/",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        subtype: z.string().min(1).max(32),
        title: z.string().min(1).max(200),
        content: z.string().min(1),
        publishedAt: z.string().datetime().optional(),
        postType: z.literal("announcement").optional(),
      })
      .parse(req.body);
    const id = await insertPost({
      postType: "announcement",
      subtype: body.subtype,
      title: body.title,
      content: body.content,
      authorUserId: req.adminAuth!.uid,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
    });
    ok(res, { id });
  }),
);

adminPostsRouter.patch(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const post = await findPostById(id);
    if (!post || post.deleted_at) {
      throw new AppError(ErrorCodes.POST_NOT_FOUND, "帖子不存在", 404);
    }
    if (post.post_type !== "announcement") {
      throw new AppError(ErrorCodes.VALIDATION, "本版仅允许编辑公告", 400);
    }
    const body = z
      .object({
        subtype: z.string().min(1).max(32).optional(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).optional(),
        publishedAt: z.string().datetime().optional(),
      })
      .parse(req.body);
    await updateAnnouncement(id, {
      ...body,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
    });
    ok(res, { id });
  }),
);

adminPostsRouter.delete(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const post = await findPostById(id);
    if (!post || post.deleted_at) {
      throw new AppError(ErrorCodes.POST_NOT_FOUND, "帖子不存在", 404);
    }
    await softDeletePost(id);
    ok(res, null);
  }),
);

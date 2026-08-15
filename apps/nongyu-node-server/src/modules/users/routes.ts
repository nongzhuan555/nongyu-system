import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middlewares/common.js";
import { requireProvisionedAdminAuth, requireAppAuth } from "../../middlewares/auth.js";
import { ok } from "../../lib/response.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { toIsoUtc, toIsoUtcRequired } from "../../lib/time.js";
import { boolFromDb, pageParams } from "../../lib/util.js";
import {
  findUserById,
  listUsersAdmin,
  patchUserAdmin,
  setAdminPasswordHash,
  updateUserQq,
} from "./repo.js";
import { toAppUserProfile } from "./mapper.js";
import { findSettingsByUserId } from "../settings/repo.js";
import { toUserSettingsDto } from "./mapper.js";
import { hashAdminPassword } from "../auth/service.js";

export const appUsersRouter = Router();
export const adminUsersRouter = Router();

appUsersRouter.get(
  "/me",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.appAuth!.uid);
    if (!user) throw new AppError(ErrorCodes.TOKEN_REVOKED, "登录状态已失效，请重新登录", 401);
    ok(res, toAppUserProfile(user));
  }),
);

appUsersRouter.patch(
  "/me",
  requireAppAuth,
  asyncHandler(async (req, res) => {
    const body = z.object({ qq: z.string().max(20) }).parse(req.body);
    const qq = body.qq.trim() === "" ? null : body.qq.trim();
    await updateUserQq(req.appAuth!.uid, qq);
    const user = await findUserById(req.appAuth!.uid);
    if (!user) throw new AppError(ErrorCodes.USER_NOT_FOUND, "用户不存在", 404);
    ok(res, toAppUserProfile(user));
  }),
);

adminUsersRouter.get(
  "/",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
        keyword: z.string().optional(),
        role: z.coerce.number().optional(),
        status: z.coerce.number().optional(),
      })
      .parse(req.query);
    const { page, pageSize, offset } = pageParams(query.page, query.pageSize);
    const { rows, total } = await listUsersAdmin({
      offset,
      pageSize,
      keyword: query.keyword,
      role: query.role,
      status: query.status,
    });
    ok(res, {
      list: rows.map((u) => ({
        id: Number(u.id),
        studentNo: u.student_no,
        name: u.name,
        college: u.college,
        grade: u.grade,
        campus: u.campus,
        role: u.role,
        status: u.status,
        isOnline: boolFromDb(u.is_online),
        lastLoginAt: toIsoUtc(u.last_login_at),
        createdAt: toIsoUtcRequired(u.created_at),
      })),
      total,
      page,
      pageSize,
    });
  }),
);

adminUsersRouter.get(
  "/:id",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const user = await findUserById(id);
    if (!user) throw new AppError(ErrorCodes.USER_NOT_FOUND, "用户不存在", 404);
    const settings = await findSettingsByUserId(id);
    ok(res, {
      ...toAppUserProfile(user),
      status: user.status,
      isOnline: boolFromDb(user.is_online),
      lastActiveAt: toIsoUtc(user.last_active_at),
      lastLoginAt: toIsoUtc(user.last_login_at),
      deviceBrand: user.device_brand,
      deviceModel: user.device_model,
      deviceOs: user.device_os,
      currentDeviceId: user.current_device_id,
      settings: toUserSettingsDto(settings),
    });
  }),
);

adminUsersRouter.patch(
  "/:id",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const body = z
      .object({
        role: z.union([z.literal(0), z.literal(1)]).optional(),
        status: z.union([z.literal(0), z.literal(1)]).optional(),
      })
      .parse(req.body);
    const user = await findUserById(id);
    if (!user) throw new AppError(ErrorCodes.USER_NOT_FOUND, "用户不存在", 404);
    await patchUserAdmin(id, body);
    const updated = await findUserById(id);
    ok(res, {
      id: Number(updated!.id),
      studentNo: updated!.student_no,
      name: updated!.name,
      role: updated!.role,
      status: updated!.status,
    });
  }),
);

adminUsersRouter.put(
  "/:id/admin-password",
  requireProvisionedAdminAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const body = z.object({ adminPassword: z.string().min(1) }).parse(req.body);
    const user = await findUserById(id);
    if (!user) throw new AppError(ErrorCodes.USER_NOT_FOUND, "用户不存在", 404);
    if (user.role !== 1) {
      throw new AppError(ErrorCodes.ADMIN_REQUIRED, "目标用户不是管理员", 403);
    }
    const hash = await hashAdminPassword(body.adminPassword);
    await setAdminPasswordHash(id, hash);
    ok(res, null);
  }),
);

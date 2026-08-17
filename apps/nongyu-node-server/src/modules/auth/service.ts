import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getEnv } from "../../config/env.js";
import { withTransaction } from "../../lib/db.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { isSuperAdminStudentNo, signAppToken, signAdminToken } from "../../lib/jwt.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { parseGender, studentNoSchema } from "../../lib/util.js";
import { insertDefaultSettings } from "../settings/repo.js";
import {
  findUserById,
  findUserByStudentNo,
  insertUser,
  logoutAppUser,
  setAdminPasswordHash,
  setUserRole,
  updateUserOnAppLogin,
} from "../users/repo.js";
import { toAppUserProfile } from "../users/mapper.js";
import { consumeHandoffTicket, createHandoffTicket } from "./handoffStore.js";

export const appLoginSchema = z.object({
  studentNo: studentNoSchema,
  name: z.string().min(1).max(64),
  major: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 128 ? v.slice(0, 128) : v)),
  college: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 128 ? v.slice(0, 128) : v)),
  className: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 128 ? v.slice(0, 128) : v)),
  grade: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 32 ? v.slice(0, 32) : v)),
  gender: z.union([z.number(), z.string()]).optional(),
  hometown: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 64 ? v.slice(0, 64) : v)),
  campus: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 64 ? v.slice(0, 64) : v)),
  qq: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 20 ? v.slice(0, 20) : v)),
  deviceId: z.string().min(1).max(128),
  deviceBrand: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 64 ? v.slice(0, 64) : v)),
  deviceModel: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 128 ? v.slice(0, 128) : v)),
  deviceOs: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 64 ? v.slice(0, 64) : v)),
});

function safeEqualText(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export async function appLogin(body: z.infer<typeof appLoginSchema>) {
  const gender = parseGender(body.gender);
  const result = await withTransaction(async (conn) => {
    const existing = await findUserByStudentNo(body.studentNo, conn);
    if (existing && existing.status !== 1) {
      throw new AppError(ErrorCodes.ACCOUNT_DISABLED, "账号已禁用", 403);
    }

    let userId: number;
    let isNewUser = false;

    if (!existing) {
      isNewUser = true;
      userId = await insertUser(
        {
          studentNo: body.studentNo,
          name: body.name,
          major: body.major ?? null,
          college: body.college ?? null,
          className: body.className ?? null,
          grade: body.grade ?? null,
          gender,
          hometown: body.hometown ?? null,
          campus: body.campus ?? null,
          qq: body.qq ?? null,
          deviceId: body.deviceId,
          deviceBrand: body.deviceBrand ?? null,
          deviceModel: body.deviceModel ?? null,
          deviceOs: body.deviceOs ?? null,
        },
        conn,
      );
      await insertDefaultSettings(userId, conn);
    } else {
      userId = existing.id;
      const keepQq = existing.qq && existing.qq.length > 0 ? existing.qq : (body.qq ?? null);
      const sameDevice =
        !!existing.current_device_id && existing.current_device_id === body.deviceId;
      await updateUserOnAppLogin(
        existing.id,
        {
          name: body.name,
          major: body.major ?? null,
          college: body.college ?? null,
          className: body.className ?? null,
          grade: body.grade ?? null,
          gender,
          hometown: body.hometown ?? null,
          campus: body.campus ?? null,
          keepQq,
          deviceId: body.deviceId,
          deviceBrand: body.deviceBrand ?? null,
          deviceModel: body.deviceModel ?? null,
          deviceOs: body.deviceOs ?? null,
          bumpTokenVersion: !sameDevice,
        },
        conn,
      );
    }

    if (isSuperAdminStudentNo(body.studentNo)) {
      await setUserRole(userId, 1, conn);
    }

    const user = await findUserById(userId, conn);
    if (!user) throw new AppError(ErrorCodes.INTERNAL, "用户写入失败", 500);
    return { user, isNewUser };
  });

  const token = await signAppToken({
    uid: result.user.id,
    studentNo: result.user.student_no,
    tokenVersion: result.user.token_version,
    deviceId: body.deviceId,
  });

  return {
    token,
    isNewUser: result.isNewUser,
    user: toAppUserProfile(result.user),
  };
}

export async function appLogout(userId: number) {
  await logoutAppUser(userId);
}

export const adminLoginSchema = z.object({
  studentNo: studentNoSchema,
  adminPassword: z.string().min(1),
  loginType: z.enum(["browser", "in_app"]).optional().default("browser"),
});

async function passwordMatchesSuperDefault(plain: string): Promise<boolean> {
  const configured = getEnv().SUPER_ADMIN_DEFAULT_PASSWORD;
  if (!configured) return false;
  return safeEqualText(plain, configured);
}

export async function adminLogin(body: z.infer<typeof adminLoginSchema>) {
  const user = await findUserByStudentNo(body.studentNo);

  if (isSuperAdminStudentNo(body.studentNo)) {
    const defaultOk = await passwordMatchesSuperDefault(body.adminPassword);
    let hashOk = false;
    if (user?.admin_password_hash) {
      hashOk = await verifyPassword(body.adminPassword, user.admin_password_hash);
    }
    if (!defaultOk && !hashOk) {
      if (!getEnv().SUPER_ADMIN_DEFAULT_PASSWORD && !user) {
        throw new AppError(
          ErrorCodes.INTERNAL,
          "超级管理员默认密码未配置（SUPER_ADMIN_DEFAULT_PASSWORD）",
          500,
        );
      }
      throw new AppError(ErrorCodes.ADMIN_PASSWORD_WRONG, "管理员密码错误", 403);
    }

    if (!user) {
      const token = await signAdminToken({
        uid: 0,
        studentNo: body.studentNo,
        bootstrap: true,
      });
      return {
        token,
        loginType: body.loginType,
        user: {
          id: 0,
          studentNo: body.studentNo,
          name: "超级管理员",
          role: 1 as const,
          bootstrap: true as const,
        },
      };
    }

    if (user.role !== 1) {
      throw new AppError(ErrorCodes.ADMIN_REQUIRED, "需要管理员权限", 403);
    }
    if (user.status !== 1) {
      throw new AppError(ErrorCodes.ACCOUNT_DISABLED, "账号已禁用", 403);
    }

    const token = await signAdminToken({
      uid: user.id,
      studentNo: user.student_no,
    });
    return {
      token,
      loginType: body.loginType,
      user: {
        id: Number(user.id),
        studentNo: user.student_no,
        name: user.name,
        role: 1 as const,
      },
    };
  }

  if (!user) {
    throw new AppError(ErrorCodes.USER_NOT_FOUND, "用户不存在，请先在 App 登录注册", 404);
  }
  if (user.role !== 1) {
    throw new AppError(ErrorCodes.ADMIN_REQUIRED, "需要管理员权限", 403);
  }
  if (user.status !== 1) {
    throw new AppError(ErrorCodes.ACCOUNT_DISABLED, "账号已禁用", 403);
  }
  if (!user.admin_password_hash) {
    throw new AppError(ErrorCodes.ADMIN_PASSWORD_WRONG, "管理员密码错误", 403);
  }
  const ok = await verifyPassword(body.adminPassword, user.admin_password_hash);
  if (!ok) {
    throw new AppError(ErrorCodes.ADMIN_PASSWORD_WRONG, "管理员密码错误", 403);
  }
  const token = await signAdminToken({
    uid: user.id,
    studentNo: user.student_no,
  });
  return {
    token,
    loginType: body.loginType,
    user: {
      id: Number(user.id),
      studentNo: user.student_no,
      name: user.name,
      role: 1 as const,
    },
  };
}

export async function changeOwnAdminPassword(userId: number, plain: string) {
  if (userId <= 0) {
    throw new AppError(
      ErrorCodes.ADMIN_REQUIRED,
      "请先在 App 登录该学号完成建档后再使用管理功能",
      403,
    );
  }
  const user = await findUserById(userId);
  if (!user) throw new AppError(ErrorCodes.USER_NOT_FOUND, "用户不存在", 404);
  if (user.role !== 1) {
    throw new AppError(ErrorCodes.ADMIN_REQUIRED, "需要管理员权限", 403);
  }
  const hash = await hashAdminPassword(plain);
  await setAdminPasswordHash(userId, hash);
}

/**
 * App JWT 用户换取短时 handoff ticket（仅已建档管理员）
 */
export async function createAppHandoff(appUserId: number) {
  const user = await findUserById(appUserId);
  if (!user) {
    throw new AppError(ErrorCodes.TOKEN_REVOKED, "登录状态已失效，请重新登录", 401);
  }
  if (user.role !== 1) {
    throw new AppError(ErrorCodes.ADMIN_REQUIRED, "需要管理员权限", 403);
  }
  if (user.status !== 1) {
    throw new AppError(ErrorCodes.ACCOUNT_DISABLED, "账号已禁用", 403);
  }
  return createHandoffTicket(Number(user.id), user.student_no);
}

export const handoffRedeemSchema = z.object({
  ticket: z.string().min(1),
});

/**
 * 兑换 handoff ticket → Admin 会话（loginType 固定 in_app）
 */
export async function redeemHandoff(ticket: string) {
  const consumed = consumeHandoffTicket(ticket);
  if (!consumed) {
    throw new AppError(ErrorCodes.TOKEN_INVALID, "Ticket 无效或已失效", 401);
  }

  const user = await findUserById(consumed.userId);
  if (!user) {
    throw new AppError(ErrorCodes.TOKEN_INVALID, "Ticket 无效或已失效", 401);
  }
  if (user.role !== 1) {
    throw new AppError(ErrorCodes.ADMIN_REQUIRED, "需要管理员权限", 403);
  }
  if (user.status !== 1) {
    throw new AppError(ErrorCodes.ACCOUNT_DISABLED, "账号已禁用", 403);
  }

  const token = await signAdminToken({
    uid: user.id,
    studentNo: user.student_no,
  });
  return {
    token,
    loginType: "in_app" as const,
    user: {
      id: Number(user.id),
      studentNo: user.student_no,
      name: user.name,
      role: 1 as const,
    },
  };
}

export async function hashAdminPassword(plain: string) {
  if (plain.length < 8) {
    throw new AppError(ErrorCodes.VALIDATION, "管理员密码至少 8 位", 400);
  }
  return hashPassword(plain);
}

import { expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { getEnv } from "../src/config/env.js";
import { closePool, getPool } from "../src/lib/db.js";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/lib/password.js";
import { runMigrations } from "../src/lib/migrate.js";

let app: Express | null = null;
let migrated = false;

export function getTestApp() {
  if (!app) app = createApp();
  return app;
}

export async function ensureMigrated() {
  getEnv();
  if (!migrated) {
    await runMigrations();
    migrated = true;
  }
}

export async function truncateAll() {
  const pool = getPool();
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of ["post_reads", "posts", "user_settings", "app_versions", "users"]) {
    await pool.query(`TRUNCATE TABLE ${table}`);
  }
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");
}

export async function cleanupTestDb() {
  await closePool();
}

export function api() {
  return request(getTestApp());
}

export async function registerAppUser(
  overrides?: Partial<{
    studentNo: string;
    name: string;
    deviceId: string;
  }>,
) {
  const studentNo = overrides?.studentNo ?? "202300001";
  const res = await api()
    .post("/api/app/auth/login")
    .send({
      studentNo,
      name: overrides?.name ?? "测试用户",
      deviceId: overrides?.deviceId ?? "device-a",
      college: "信息工程学院",
      gender: 1,
    })
    .expect(200);
  expect(res.body.code).toBe(0);
  return {
    token: res.body.data.token as string,
    user: res.body.data.user,
    isNewUser: res.body.data.isNewUser as boolean,
  };
}

export async function promoteAdmin(studentNo: string, password = "AdminPass1") {
  const pool = getPool();
  const hash = await hashPassword(password);
  await pool.query(`UPDATE users SET role = 1, admin_password_hash = ? WHERE student_no = ?`, [
    hash,
    studentNo,
  ]);
  return password;
}

export async function adminLogin(studentNo: string, adminPassword: string) {
  const res = await api()
    .post("/api/admin/auth/login")
    .send({ studentNo, adminPassword })
    .expect(200);
  expect(res.body.code).toBe(0);
  return res.body.data.token as string;
}

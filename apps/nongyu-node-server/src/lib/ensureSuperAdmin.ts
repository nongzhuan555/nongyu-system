import { getEnv } from "../config/env.js";
import { getPool } from "./db.js";
import { createLogger } from "./logger.js";

const logger = createLogger();

/**
 * 启动时幂等：将 SUPER_ADMIN_STUDENT_NO 对应用户升为 role=2。
 * env 未配或用户不存在时跳过，不阻断启动。
 */
export async function ensureSuperAdminRole(): Promise<void> {
  const studentNo = getEnv().SUPER_ADMIN_STUDENT_NO?.trim();
  if (!studentNo) {
    logger.warn("SUPER_ADMIN_STUDENT_NO 未配置，跳过超管升权");
    return;
  }
  try {
    const [result] = await getPool().query(
      `UPDATE users SET role = 2 WHERE student_no = ? AND role <> 2`,
      [studentNo],
    );
    const affected = Number((result as { affectedRows?: number }).affectedRows ?? 0);
    if (affected > 0) {
      logger.info({ studentNo, affected }, "超级管理员学号用户已升为 role=2");
    }
  } catch (err) {
    logger.error({ err, studentNo }, "超级管理员升权失败（不阻断启动）");
  }
}

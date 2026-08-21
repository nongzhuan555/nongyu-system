import { TRACK_SQL_MAX_EXECUTES } from "./types";

// 全局记录SQLAgent的执行次数，用于限制最大执行次数，防止SQLAgent无限循环执行sql不退出，虽然有最大步骤限制
let executeCount = 0;

/** 每次包装 tool 调用开始时重置后端执行计数。 */
export function beginSqlAgentRun(): void {
  executeCount = 0;
}

/** 占用一次后端执行名额；已满则返回 false。 */
export function consumeSqlExecuteSlot(): boolean {
  if (executeCount >= TRACK_SQL_MAX_EXECUTES) return false;
  executeCount += 1;
  return true;
}

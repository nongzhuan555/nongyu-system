/** 用户角色：0 普通用户 / 1 管理员 / 2 超级管理员 */
export type UserRole = 0 | 1 | 2;

/** 可进入管理端的角色（普通管理员或超管） */
export function isAdminRole(role: number): role is 1 | 2 {
  return role === 1 || role === 2;
}

/** 超管专属（改采样率、提权等） */
export function isSuperAdminRole(role: number): role is 2 {
  return role === 2;
}

export type LoginType = "browser" | "in_app";

export type AdminRole = 1 | 2;

export type AdminUser = {
  id: number;
  studentNo: string;
  name: string;
  role: AdminRole;
  /** 超管未建档时的引导会话 */
  bootstrap?: boolean;
};

export type AdminSession = {
  token: string;
  user: AdminUser;
};

export type AdminLoginResult = {
  token: string;
  loginType: LoginType;
  user: AdminUser;
};

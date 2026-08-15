import { QueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { saveSecondPassword } from "@/storage/secureCredentials";
import {
  bridgeSecondLogin,
  bridgeSetSecondLoginData,
  clearSecondToolSession,
  persistCurrentSecondToken,
} from "./secondSession";
import { refreshSecondAuthFlag } from "@/modules/second/hooks/useSecondAuth";

export type PerformSecondLoginInput = {
  studentId: string;
  password: string;
  queryClient?: QueryClient;
};

export type PerformSecondLoginResult = {
  ok: boolean;
  message?: string;
};

/**
 * 二课登录：校验 → 持久化密码与 token → 刷新 second queries
 */
export async function performSecondLogin(
  input: PerformSecondLoginInput,
): Promise<PerformSecondLoginResult> {
  const studentId = input.studentId.trim();
  const password = input.password.trim();
  if (!studentId || !password) {
    return { ok: false, message: "请输入学号和二课密码" };
  }

  const result = await bridgeSecondLogin(studentId, password);
  if (!result.success) {
    return { ok: false, message: result.message || "二课登录失败" };
  }

  bridgeSetSecondLoginData(studentId, password);
  persistCurrentSecondToken();
  await saveSecondPassword(password);
  refreshSecondAuthFlag();

  if (input.queryClient) {
    await input.queryClient.invalidateQueries({ queryKey: ["second"] });
  }

  return { ok: true };
}

/**
 * 仅清理二课会话（不登出农屿）
 */
export async function performSecondLogout(queryClient?: QueryClient): Promise<void> {
  clearSecondToolSession();
  refreshSecondAuthFlag();
  if (queryClient) {
    queryClient.removeQueries({ queryKey: ["second"] });
  }
  toast.info("已退出二课会话");
}

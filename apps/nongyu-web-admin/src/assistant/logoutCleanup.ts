import { clearAgentConfig } from "./storage/agentConfig";
import { clearSessions } from "./storage/sessionRepository";

/** 主动退出登录时清会话与自有 Key。401 不得调用。 */
export function clearAssistantOnLogout(adminUserId: number | undefined): void {
  // agent 单例销毁走动态导入，避免本模块被 auth 同步引用时拖入整包助手
  void import("./agent").then(({ invalidateAdminAgent }) => {
    invalidateAdminAgent();
  });
  clearAgentConfig();
  if (adminUserId && adminUserId > 0) {
    clearSessions(adminUserId);
  }
}

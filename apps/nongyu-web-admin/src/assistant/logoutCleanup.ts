import { clearAgentConfig } from "./storage/agentConfig";
import { clearSessions } from "./storage/sessionRepository";
import { invalidateAdminAgent } from "./agent";

/** 主动退出登录时清会话与自有 Key。401 不得调用。 */
export function clearAssistantOnLogout(adminUserId: number | undefined): void {
  invalidateAdminAgent();
  clearAgentConfig();
  if (adminUserId && adminUserId > 0) {
    clearSessions(adminUserId);
  }
}

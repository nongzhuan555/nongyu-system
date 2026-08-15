import { AppState, type AppStateStatus } from "react-native";
import { toast } from "@/components/ui/toast";
import { agentChatRunner } from "./agentChatRunner";

let installed = false;

/**
 * 轻量后台保活感知：不主动 abort；回前台若生成已因挂起中断则 Toast。
 * 无原生长后台能力时，系统仍可能杀进程——仅尽力。
 */
export function installAgentChatBackgroundKeepAlive(): void {
  if (installed) return;
  installed = true;

  let last: AppStateStatus = AppState.currentState;

  const onChange = (next: AppStateStatus) => {
    const wentBackground =
      (last === "active" || last === "unknown") && (next === "background" || next === "inactive");
    const wentActive = (last === "background" || last === "inactive") && next === "active";

    if (wentBackground) {
      agentChatRunner.markAppBackgrounded();
    }

    if (wentActive) {
      if (agentChatRunner.consumeBackgroundInterruptToast()) {
        toast.error("应用进入后台后生成已中断，请重试");
      }
    }

    last = next;
  };

  AppState.addEventListener("change", onChange);
}

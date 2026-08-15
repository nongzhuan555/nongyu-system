import { message } from "antd";
import type { AssistantChatAdapter } from "./types";

/** 占位适配器：仅提示未接入，不发网络请求。 */
export const placeholderAssistantAdapter: AssistantChatAdapter = {
  send() {
    message.info("智慧助手暂未接入");
  },
  getMessages() {
    return [];
  },
};

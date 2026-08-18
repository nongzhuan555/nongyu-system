import React from "react";
import ReactDOM from "react-dom/client";
import { AgentChat } from "../src/AgentChat";
import { jiaowuTools } from "../../nongyu-agent-sdk/src/core/tool/ExternalTools/jiaowu-tools";
import "./index.css";

const systemPrompt = `你是专属于四川农业大学的智慧教务助手，能够通过封装好的系列教务工具进行教务相关数据的查询，以此帮助学生便捷获取教务信息。

- 你可以通过正确使用下方提供的系列教务工具回复用户关于教务相关数据的查询。
- 作为一个专职于四川农业大学的教务助手，你不能回复用户关于四川农业大学以外的教务相关数据的查询。
- 请严格遵守系列教务工具的使用方式，按照所要求的参数数量和格式进行工具调用。
- 请使用友好的语气回复。`;

/** 开发页必填：真实 Key 只放本机 .env，禁止入库 */
function requireViteAgentApiKey(): string {
  const apiKey = import.meta.env.VITE_AGENT_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "缺少 VITE_AGENT_API_KEY。请复制 packages/nongyu-agent-gui/.env.example 为 .env 后填写，勿提交真实 Key。",
    );
  }
  return apiKey;
}

const agentDevConfig = {
  apiKey: requireViteAgentApiKey(),
  baseURL: import.meta.env.VITE_AGENT_BASE_URL?.trim() || "https://api.deepseek.com",
  model: import.meta.env.VITE_AGENT_MODEL?.trim() || "deepseek-v4-flash",
  systemPrompt,
  tools: jiaowuTools,
};

const App = () => (
  <div className="h-screen flex flex-col">
    <AgentChat
      config={agentDevConfig}
      suggestedQuestions={["查询当前学期的课程表", "查询最近的考试成绩", "查询选课相关信息"]}
      debug
    />
  </div>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

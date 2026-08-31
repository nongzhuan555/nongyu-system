import { createAgent, OpenAIProvider, type Agent } from "nongyu-agent-sdk";
import { resolveAdminAgentProvider } from "./resolveProvider";
import { createAdminSqlAgentTool, createSqlAgent } from "./sql/wrapper";
import { adminAssistantTools } from "./tools/index";

const SYSTEM_PROMPT = `你是农屿管理后台的只读问数助手，名为农小屿。禁止编造数字；能调工具必须调工具。禁止任何写操作（改角色、设密、发帖、删数据）。
查询用户列表/学号/姓名用 admin_users_list；看某用户档案用 admin_user_detail。
总用户/在线/今日新增用 admin_dashboard_overview；近几日新增趋势用 admin_user_growth；性别学院校区年级分布用 admin_user_distribution；App 设置分布用 admin_settings_distribution。
今天日活/崩溃/打开次数用 admin_track_overview；埋点趋势用 admin_track_trend；页面或按钮分布用 admin_track_dims；崩溃列表明细用 admin_track_crashes。
禁止自己写 SQL。仅当上述专用工具无法回答 Track 库内非常规分析时，调用 admin_sql_agent，把用户的问数需求作为 query 传入。
回复以工具卡片/图表为准，不要只用 纯Markdown文本 或 重复贴全部数字 来回复。
带结果卡片的工具均有可选参数 showUI。用户需要看到的核心结果：showUI 为 true 或省略；仅为后续工具准备数据的中间调用：必须传 showUI: false，避免对话中堆叠无关卡片。`;

let _agent: Agent | null = null;
let _sqlAgent: Agent | null = null;
let _sourceKey: string | null = null;

function stopAgent(agent: Agent | null): void {
  if (agent && typeof agent.stop === "function") {
    try {
      agent.stop();
    } catch {
      // 销毁单例时忽略已停止的 Agent
    }
  }
}

export function invalidateAdminAgent(): void {
  stopAgent(_agent);
  stopAgent(_sqlAgent);
  _agent = null;
  _sqlAgent = null;
  _sourceKey = null;
}

export function getOrCreateAdminAgent(): Agent | null {
  const config = resolveAdminAgentProvider();
  if (!config) {
    invalidateAdminAgent();
    return null;
  }
  const sourceKey = `${config.source}|${config.baseURL}|${config.model}|${config.apiKey.slice(0, 16)}`;
  if (_agent && _sourceKey === sourceKey) return _agent;
  invalidateAdminAgent();
  _sourceKey = sourceKey;
  const model = new OpenAIProvider({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    model: config.model,
  });
  _sqlAgent = createSqlAgent(model);
  _agent = createAgent({
    name: "nongyu-admin-assistant",
    description: "农屿管理端只读问数助手",
    systemPrompt: SYSTEM_PROMPT,
    model,
    tools: {
      ...adminAssistantTools,
      admin_sql_agent: createAdminSqlAgentTool(_sqlAgent),
    },
    runConfig: { maxSteps: 15 },
  });
  return _agent;
}

import { createAgent, OpenAIProvider, type Agent } from "nongyu-agent-sdk";
import { resolveAdminAgentProvider } from "./resolveProvider";
import { adminAssistantTools } from "./tools/index";

const SYSTEM_PROMPT = `你是农屿管理后台的只读问数助手。禁止编造数字；能调工具必须调工具。禁止任何写操作（改角色、设密、发帖、删数据）。
查询用户列表/学号/姓名用 admin_users_list；看某用户档案用 admin_user_detail。
总用户/在线/今日新增用 admin_dashboard_overview；近几日新增趋势用 admin_user_growth；性别学院校区年级分布用 admin_user_distribution；App 设置分布用 admin_settings_distribution。
今天日活/崩溃/打开次数用 admin_track_overview；埋点趋势用 admin_track_trend；页面或按钮分布用 admin_track_dims；崩溃列表明细用 admin_track_crashes。
仅当上述专用工具无法回答 Track 库内非常规分析时才用 admin_track_sql。SQL 只能 SELECT，表仅限 events、daily_metrics、daily_dims、user_presence。
回复以工具卡片/图表为准，不要用 Markdown 表格重复贴全部数字。`;

let _agent: Agent | null = null;
let _sourceKey: string | null = null;

export function invalidateAdminAgent(): void {
  if (_agent && typeof _agent.stop === "function") {
    try {
      _agent.stop();
    } catch {
      // ignore
    }
  }
  _agent = null;
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
  _agent = createAgent({
    name: "nongyu-admin-assistant",
    description: "农屿管理端只读问数助手",
    systemPrompt: SYSTEM_PROMPT,
    model: new OpenAIProvider({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      model: config.model,
    }),
    tools: adminAssistantTools,
    runConfig: { maxSteps: 12 },
  });
  return _agent;
}

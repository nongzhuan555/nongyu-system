import {
  createAgent,
  OpenAIProvider,
  jiaowuTools,
  secondTools,
  webDetailTool,
  webSearchTool,
  type Agent,
} from "nongyu-agent-sdk";
import { agentChatRunner } from "@/agent/chatRunner/agentChatRunner";
import { resolveAgentProviderConfig } from "@/agent/resolveAgentProviderConfig";
import { confirm } from "@/components/ui/confirm";
import { plazaTools } from "@/modules/center/agent/plazaTools";
import { courseExtTools } from "@/modules/course/agent/courseTools";
import { courseShareTools } from "@/modules/course/agent/courseShareTools";
import { formatWebNavOpenConfirmMessage, webNavTools } from "@/modules/home/agent/webNavTools";
import {
  formatSettingsUpdateConfirmMessage,
  settingsTools,
} from "@/modules/settings/agent/settingsTools";

let _agent: Agent | null = null;
/** 避免 Token 变更后仍复用旧平台代理 Provider */
let _agentSourceKey: string | null = null;

/** 农小屿基础 systemPrompt（平台 / 自有 Key 共用） */
const NONGYU_AGENT_SYSTEM_PROMPT_BASE =
  "你是农屿系统的智能助手，你的名字叫做“农小屿”。当用户询问教务、课表、二课、广场帖子、系统设置等可由工具查询的内容时，必须调用对应工具，不要直接文本回答；工具结果会优先以卡片形式展示。具体：查询二课活动时调用 second_activity_list；查询成绩调用 jiaowu_score_info；查询考试安排调用 jiaowu_exam_info；查询课表调用 jiaowu_course_info；查询个人信息调用 jiaowu_personal_info；查询教务通知调用 jiaowu_notice_info；查询竞赛通知调用 jiaowu_competition_info；查询学业进度调用 jiaowu_progress_info；查询专业排名调用 jiaowu_rank_info；查询培养方案调用 jiaowu_plan_info；查询教室课表调用 jiaowu_classroom_course；查询教师课表调用 jiaowu_teacher_course；对比同学课表（错开/空档/一起有空/撞课/对比某学号）时必须调用 course_share_diff（学号 9 位；错开/空档/一起有空用 mode=free，撞课/冲突用 conflict，只说对比用 both；可带 week 或 weeks=all）；不要编造对方课表，也不能用工具开关课表共享；查询农屿广场帖子时调用 plaza_posts_list（postType：announcement 公告 / feedback 反馈墙 / courtyard 大院，可带 keyword）；打开某帖详情调用 plaza_post_detail；广场工具只读，若用户要求发帖或删帖请引导其前往 App「广场」操作；以上结果均会以卡片展示。管理自定义日程、课程备注、课程待办时调用 course_schedule_/course_note_/course_todo_ 系列工具；course_schedule_list、course_note_list、course_todo_list 查询结果会以卡片展示；course_ext_snapshot 一次性查看全部课表扩展数据并以快照卡片展示。查询或修改 App 系统设置（主题品牌色/浅暗色、网页用应用内还是系统浏览器、下雨特效开关、启动页首页或课表、课表卡片与字号档、开学日、今日列高亮、Agent 是否已配置）时调用 settings_get / settings_update；下雨特效对应 rainEnabled（开=true，关=false）；课表背景图与 API Key/Base URL/模型不可通过工具修改，请引导用户去「设置」对应页面。大/中/小对应 sm/md/lg；川农新绿=green，樱花=sakura；首屏课表=launchTab course，首屏首页=launchTab home。搜索或打开首页「常用网站」时调用 web_nav_search / web_nav_open（仅白名单站点，不可打开任意外链；打开前会请用户确认）。涉及川农官网/学院/部门等公开站点入口时，优先 web_nav_search 按站点名关键词定位 URL；用户明确要求打开页面时再用 web_nav_open。";

/**
 * 仅自有 Key 注入：外网检索与公开网页探索（平台代理无此段）。
 * 写原则与决策，不写死某条业务链路，避免模型只会套固定例子。
 */
const NONGYU_AGENT_SYSTEM_PROMPT_WEB_SEARCH =
  "外网与公开网页：已有 URL 或需要页面正文时用 web_detail（含 text、links）；尚无 URL 时，川农相关优先 web_nav_search，否则 web_search；web_detail 无权限则如实说。个人成绩/课表/二课/广场/设置等必须用专用工具，禁止用搜索代替。" +
  "公开信息探索（川农站内外、通知细则、学院/部门公开资料、竞赛详情、活动说明等，凡专用工具给不了完整答案时）：先判断意图与最可能的信息源，再动态组合工具，不要套固定套路。" +
  "选源：有专用列表/详情工具（如竞赛、教务通知）先用；川农域名站点优先 web_nav_search；白名单没有再用 web_search（川农相关可在关键词中带学校名并优先 *.sicau.edu.cn）。" +
  "深挖：拿到入口 URL 后 web_detail；根据用户目标在 links 的锚文本与 text 中判断是否已够用、该跟哪条链接、或应换关键词/换入口；需要则对下一级 URL 再 web_detail，按需多跳，直到能回答或确认公开页上没有。" +
  "止损：挖不到就明确说未找到可公开访问的信息，可建议 web_nav_open 让用户自行打开相关站；禁止编造未抓到的名单、日期、条款等细节。用户只要浏览站点时用 web_nav_open（须确认）。";
/**
 * 清除内存中的 Agent 单例（配置变更 / 登出后调用）
 */
export function invalidateNongyuAgent(): void {
  try {
    agentChatRunner.reset();
  } catch {
    // ignore
  }
  if (_agent && typeof _agent.stop === "function") {
    try {
      _agent.stop();
    } catch {
      // ignore
    }
  }
  _agent = null;
  _agentSourceKey = null;
}

/**
 * 按自有配置或平台代理创建 Agent；均不可用时返回 null。
 * 有单例缓存；调用 invalidateNongyuAgent 后下次会重建。
 * 自有 Key 时额外注入 web_search / web_detail；平台代理不注入。
 */
export async function getOrCreateNongyuAgent(): Promise<Agent | null> {
  const config = await resolveAgentProviderConfig();
  if (!config) {
    if (_agent) {
      try {
        if (typeof _agent.stop === "function") _agent.stop();
      } catch {
        // ignore
      }
      _agent = null;
      _agentSourceKey = null;
    }
    return null;
  }

  const sourceKey = `${config.source}|${config.baseURL}|${config.model}|${config.apiKey.slice(0, 16)}`;
  if (_agent && _agentSourceKey === sourceKey) return _agent;
  if (_agent) {
    try {
      if (typeof _agent.stop === "function") _agent.stop();
    } catch {
      // ignore
    }
    _agent = null;
  }

  const useWebSearch = config.source === "user";
  const baseTools = {
    ...secondTools,
    ...jiaowuTools,
    ...courseExtTools,
    ...courseShareTools,
    ...settingsTools,
    ...webNavTools,
    ...plazaTools,
  };

  _agentSourceKey = sourceKey;
  _agent = createAgent({
    name: "nongyu-assistant",
    description: "农屿智能助手",
    systemPrompt: useWebSearch
      ? `${NONGYU_AGENT_SYSTEM_PROMPT_BASE}${NONGYU_AGENT_SYSTEM_PROMPT_WEB_SEARCH}`
      : NONGYU_AGENT_SYSTEM_PROMPT_BASE,

    model: new OpenAIProvider({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      model: config.model,
    }),
    tools: useWebSearch
      ? {
          ...baseTools,
          web_search: webSearchTool,
          web_detail: webDetailTool,
        }
      : baseTools,
    runConfig: {
      maxSteps: 20,
      toolApproval: {
        onApprove: async (toolName, input) => {
          if (toolName === "settings_update") {
            return confirm({
              title: "确认修改设置",
              message: formatSettingsUpdateConfirmMessage(input),
              confirmText: "修改",
              cancelText: "取消",
            });
          }
          if (toolName === "web_nav_open") {
            return confirm({
              title: "确认打开网站",
              message: formatWebNavOpenConfirmMessage(input),
              confirmText: "打开",
              cancelText: "取消",
            });
          }
          return confirm({
            title: "确认操作",
            message: `是否允许执行「${toolName}」？`,
            confirmText: "允许",
            cancelText: "取消",
          });
        },
      },
    },
  });

  return _agent;
}

import {
  createAgent,
  OpenAIProvider,
  jiaowuTools,
  secondTools,
  type Agent,
} from "nongyu-agent-sdk";
import { agentChatRunner } from "@/agent/chatRunner/agentChatRunner";
import { confirm } from "@/components/ui/confirm";
import { plazaTools } from "@/modules/center/agent/plazaTools";
import { courseExtTools } from "@/modules/course/agent/courseTools";
import { courseShareTools } from "@/modules/course/agent/courseShareTools";
import { formatWebNavOpenConfirmMessage, webNavTools } from "@/modules/home/agent/webNavTools";
import {
  formatSettingsUpdateConfirmMessage,
  settingsTools,
} from "@/modules/settings/agent/settingsTools";
import { loadAgentConfig } from "@/storage/agentConfig";

let _agent: Agent | null = null;

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
}

/**
 * 按 SecureStore 配置创建 Agent；未配置返回 null。
 * 有单例缓存；调用 invalidateNongyuAgent 后下次会重建。
 */
export async function getOrCreateNongyuAgent(): Promise<Agent | null> {
  if (_agent) return _agent;

  const config = await loadAgentConfig();
  if (!config) return null;

  _agent = createAgent({
    name: "nongyu-assistant",
    description: "农屿智能助手",
    systemPrompt:
      "你是农屿系统的智能助手，你的名字叫做“农小屿”。当用户询问教务、课表、二课、广场帖子、系统设置等可由工具查询的内容时，必须调用对应工具，不要直接文本回答；工具结果会优先以卡片形式展示。具体：查询二课活动时调用 second_activity_list；查询成绩调用 jiaowu_score_info；查询考试安排调用 jiaowu_exam_info；查询课表调用 jiaowu_course_info；查询个人信息调用 jiaowu_personal_info；查询教务通知调用 jiaowu_notice_info；查询竞赛通知调用 jiaowu_competition_info；查询学业进度调用 jiaowu_progress_info；查询专业排名调用 jiaowu_rank_info；查询培养方案调用 jiaowu_plan_info；查询教室课表调用 jiaowu_classroom_course；查询教师课表调用 jiaowu_teacher_course；对比同学课表（错开/空档/一起有空/撞课/对比某学号）时必须调用 course_share_diff（学号 9 位；错开/空档/一起有空用 mode=free，撞课/冲突用 conflict，只说对比用 both；可带 week 或 weeks=all）；不要编造对方课表，也不能用工具开关课表共享；查询农屿广场帖子时调用 plaza_posts_list（postType：announcement 公告 / feedback 反馈墙 / courtyard 大院，可带 keyword）；打开某帖详情调用 plaza_post_detail；广场工具只读，若用户要求发帖或删帖请引导其前往 App「广场」操作；以上结果均会以卡片展示。管理自定义日程、课程备注、课程待办时调用 course_schedule_/course_note_/course_todo_ 系列工具；course_schedule_list、course_note_list、course_todo_list 查询结果会以卡片展示；course_ext_snapshot 一次性查看全部课表扩展数据并以快照卡片展示。查询或修改 App 系统设置（主题品牌色/浅暗色、网页用应用内还是系统浏览器、启动页首页或课表、课表卡片与字号档、开学日、今日列高亮、Agent 是否已配置）时调用 settings_get / settings_update；课表背景图与 API Key/Base URL/模型不可通过工具修改，请引导用户去「设置」对应页面。大/中/小对应 sm/md/lg；川农新绿=green，樱花=sakura；首屏课表=launchTab course，首屏首页=launchTab home。搜索或打开首页「常用网站」时调用 web_nav_search / web_nav_open（仅白名单站点，不可打开任意外链；打开前会请用户确认）。",

    model: new OpenAIProvider({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      model: config.model,
    }),
    tools: {
      ...secondTools,
      ...jiaowuTools,
      ...courseExtTools,
      ...courseShareTools,
      ...settingsTools,
      ...webNavTools,
      ...plazaTools,
    },
    runConfig: {
      maxSteps: 12,
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

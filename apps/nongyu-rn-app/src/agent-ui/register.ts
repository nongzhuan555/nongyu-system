import { registerToolUI } from "./registry";
import { SecondActivityListCard } from "@/components/agent/SecondActivityListCard";
import { ScoreCard } from "@/components/agent/ScoreCard";
import { ExamCard } from "@/components/agent/ExamCard";
import { CourseCard } from "@/components/agent/CourseCard";
import { PersonalInfoCard } from "@/components/agent/PersonalInfoCard";
import { NoticeCard } from "@/components/agent/NoticeCard";
import { CompetitionCard } from "@/components/agent/CompetitionCard";
import { ProgressCard } from "@/components/agent/ProgressCard";
import { RankCard } from "@/components/agent/RankCard";
import { PlanCard } from "@/components/agent/PlanCard";
import { ClassroomCourseCard } from "@/components/agent/ClassroomCourseCard";
import { TeacherCourseCard } from "@/components/agent/TeacherCourseCard";
import { CourseScheduleCard } from "@/components/agent/CourseScheduleCard";
import { CourseNoteCard } from "@/components/agent/CourseNoteCard";
import { CourseTodoCard } from "@/components/agent/CourseTodoCard";
import { CourseExtSnapshotCard } from "@/components/agent/CourseExtSnapshotCard";
import { CourseShareDiffCard } from "@/components/agent/CourseShareDiffCard";
import { PlazaPostListCard } from "@/components/agent/PlazaPostListCard";
import { PlazaPostDetailCard } from "@/components/agent/PlazaPostDetailCard";
import { AgentSettingsNavCard } from "@/components/agent/AgentSettingsNavCard";
import { PLATFORM_LLM_BUSY_NAV_TOOL } from "@/agent/platformLlmBusy";

/**
 * 模块级注册各业务工具的内联渲染组件。
 *
 * 已注册：
 * - second_activity_list：二课活动列表卡片。
 * - jiaowu_score_info：成绩卡片。
 * - jiaowu_exam_info：考试安排卡片。
 * - jiaowu_course_info：课表卡片。
 * - jiaowu_personal_info：个人信息卡片。
 * - jiaowu_notice_info：教务通知卡片。
 * - jiaowu_competition_info：竞赛通知卡片。
 * - jiaowu_progress_info：学业进度卡片。
 * - jiaowu_rank_info：专业排名卡片。
 * - jiaowu_plan_info：培养方案卡片。
 * - jiaowu_classroom_course：教室课表卡片。
 * - jiaowu_teacher_course：教师课表卡片。
 * - course_schedule_list：自定义日程卡片。
 * - course_note_list：课程备注卡片。
 * - course_todo_list：课程待办卡片。
 * - course_ext_snapshot：课表扩展快照卡片。
 * - course_share_diff：共享课表对比卡片。
 * - plaza_posts_list / plaza_post_detail：广场帖子列表/详情卡片。
 * - platform_llm_busy_nav：平台模型排队繁忙 → Agent 设置入口。
 *
 * 在 app/_layout.tsx 顶部 `import "@/agent-ui/register"` 即可在启动时完成注册。
 */
registerToolUI("second_activity_list", SecondActivityListCard);
registerToolUI("jiaowu_score_info", ScoreCard);
registerToolUI("jiaowu_exam_info", ExamCard);
registerToolUI("jiaowu_course_info", CourseCard);
registerToolUI("jiaowu_personal_info", PersonalInfoCard);
registerToolUI("jiaowu_notice_info", NoticeCard);
registerToolUI("jiaowu_competition_info", CompetitionCard);
registerToolUI("jiaowu_progress_info", ProgressCard);
registerToolUI("jiaowu_rank_info", RankCard);
registerToolUI("jiaowu_plan_info", PlanCard);
registerToolUI("jiaowu_classroom_course", ClassroomCourseCard);
registerToolUI("jiaowu_teacher_course", TeacherCourseCard);
registerToolUI("course_schedule_list", CourseScheduleCard);
registerToolUI("course_note_list", CourseNoteCard);
registerToolUI("course_todo_list", CourseTodoCard);
registerToolUI("course_ext_snapshot", CourseExtSnapshotCard);
registerToolUI("course_share_diff", CourseShareDiffCard);
registerToolUI("plaza_posts_list", PlazaPostListCard);
registerToolUI("plaza_post_detail", PlazaPostDetailCard);
registerToolUI(PLATFORM_LLM_BUSY_NAV_TOOL, AgentSettingsNavCard);

/**
 * 保留空函数供旧调用方兼容，注册实际在 import 时完成。
 */
export function registerAgentUI(): void {}

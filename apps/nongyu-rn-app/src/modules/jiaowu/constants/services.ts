import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export type JiaowuServiceItem = {
  key: string;
  title: string;
  hint: string;
  icon: IoniconName;
  href: Href;
  /** 是否需要教务登录 */
  requireAuth: boolean;
};

/**
 * 教务首页七大入口
 */
export const JIAOWU_SERVICES: JiaowuServiceItem[] = [
  {
    key: "notice",
    title: "教务通知",
    hint: "教学公告",
    icon: "notifications-outline",
    href: "/home/jiaowu/notice" as Href,
    requireAuth: false,
  },
  {
    key: "competition",
    title: "竞赛通知",
    hint: "竞赛与赛事",
    icon: "trophy-outline",
    href: "/home/jiaowu/competition" as Href,
    requireAuth: false,
  },
  {
    key: "progress",
    title: "学业进度",
    hint: "学分修读",
    icon: "stats-chart-outline",
    href: "/home/jiaowu/progress" as Href,
    requireAuth: true,
  },
  {
    key: "score",
    title: "成绩查询",
    hint: "学期成绩",
    icon: "school-outline",
    href: "/home/jiaowu/score" as Href,
    requireAuth: true,
  },
  {
    key: "rank",
    title: "专业排名",
    hint: "加权与名次",
    icon: "podium-outline",
    href: "/home/jiaowu/rank" as Href,
    requireAuth: true,
  },
  {
    key: "exam",
    title: "考试安排",
    hint: "时间地点座位",
    icon: "calendar-outline",
    href: "/home/jiaowu/exam" as Href,
    requireAuth: true,
  },
  {
    key: "plan",
    title: "培养方案",
    hint: "课程计划",
    icon: "book-outline",
    href: "/home/jiaowu/plan" as Href,
    requireAuth: true,
  },
];

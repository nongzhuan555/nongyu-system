import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export type SecondServiceItem = {
  key: string;
  title: string;
  hint: string;
  icon: IoniconName;
  href: Href;
};

/**
 * 二课首页入口
 */
export const SECOND_SERVICES: SecondServiceItem[] = [
  {
    key: "activities",
    title: "二课活动",
    hint: "浏览活动列表与详情",
    icon: "ribbon-outline",
    href: "/home/second/activities" as Href,
  },
  {
    key: "profile",
    title: "个人信息",
    hint: "查看个人学分、综测及排名",
    icon: "person-circle-outline",
    href: "/home/second/profile" as Href,
  },
];

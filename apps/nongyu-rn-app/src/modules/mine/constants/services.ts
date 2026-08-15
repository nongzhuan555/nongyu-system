import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

export type ServiceAction =
  | { kind: "navigate"; href: Href }
  | { kind: "share" }
  | { kind: "about" };

export type ServiceItem = {
  key: string;
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  action: ServiceAction;
};

/** 农屿品牌官网（关于入口） */
export const ABOUT_URL = "https://nongyu-app.github.io/index.html";

/** 「更多服务」入口配置（本版本不含评论/回复） */
export const SERVICE_ITEMS: ServiceItem[] = [
  {
    key: "posts",
    title: "我的帖子",
    description: "查看你发布过的内容",
    icon: "document-text-outline",
    action: { kind: "navigate", href: "/mine/posts" },
  },
  {
    key: "share",
    title: "分享农屿",
    description: "推荐给你的同学、朋友和室友吧",
    icon: "share-outline",
    action: { kind: "share" },
  },
  {
    key: "about",
    title: "关于农屿",
    description: "了解更多关于农屿的信息",
    icon: "information-circle-outline",
    action: { kind: "about" },
  },
];

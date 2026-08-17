import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

export type ServiceAction =
  | { kind: "navigate"; href: Href }
  | { kind: "share" }
  | { kind: "about" }
  | { kind: "admin" };

export type ServiceItem = {
  key: string;
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  action: ServiceAction;
};

/** 农屿品牌官网（关于入口） */
export const ABOUT_URL = "http://101.43.34.229/";

/** 管理员可见：Web 管理台入口 */
export const ADMIN_SERVICE_ITEM: ServiceItem = {
  key: "admin",
  title: "农屿管理台",
  description: "打开 Web 管理后台（自动登录）",
  icon: "desktop-outline",
  action: { kind: "admin" },
};

/** 「更多服务」入口配置 */
export const SERVICE_ITEMS: ServiceItem[] = [
  {
    key: "posts",
    title: "我的帖子",
    description: "查看你发布过的内容",
    icon: "document-text-outline",
    action: { kind: "navigate", href: "/mine/posts" },
  },
  {
    key: "replies",
    title: "留言与回复",
    description: "查看收到的与我发出的留言",
    icon: "chatbubbles-outline",
    action: { kind: "navigate", href: "/mine/replies" },
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

/**
 * 按角色组装「更多服务」列表（管理员在关于前插入管理台）
 */
export function buildServiceItems(role: 0 | 1 | null): ServiceItem[] {
  if (role !== 1) return SERVICE_ITEMS;
  const aboutIndex = SERVICE_ITEMS.findIndex((item) => item.key === "about");
  if (aboutIndex < 0) return [...SERVICE_ITEMS, ADMIN_SERVICE_ITEM];
  return [
    ...SERVICE_ITEMS.slice(0, aboutIndex),
    ADMIN_SERVICE_ITEM,
    ...SERVICE_ITEMS.slice(aboutIndex),
  ];
}

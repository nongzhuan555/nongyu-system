/**
 * 广场帖子只读 Agent Tools（需 App JWT，放 RN 侧）
 */
import { z } from "zod";
import { tool } from "nongyu-agent-sdk";
import { fetchPostDetail, fetchPosts, type PostType } from "@/modules/center/api/posts";

const postTypeSchema = z
  .enum(["announcement", "feedback", "courtyard"])
  .describe("分区：announcement=公告，feedback=反馈墙，courtyard=大院");

/** 对话内列表展示上限，与工具 pageSize 对齐 */
export const PLAZA_AGENT_LIST_LIMIT = 5;

export const plazaPostsListTool = tool({
  name: "plaza_posts_list",
  description:
    "查询农屿广场帖子列表（只读）。postType：announcement 公告 / feedback 反馈墙 / courtyard 大院。可选 keyword 搜标题与正文、subtype 精确标签。结果以帖子卡片展示；不含作者署名。禁止用于发帖或删帖。",
  inputSchema: z.object({
    postType: postTypeSchema,
    keyword: z.string().max(64).optional().describe("标题/正文关键词，可选"),
    subtype: z.string().max(32).optional().describe("标签，如 system/bug/life，可选"),
    page: z.number().int().positive().optional().describe("页码，从 1 开始，默认 1"),
  }),
  render: { component: "PlazaPostListCard" },
  async execute({ postType, keyword, subtype, page }) {
    return await fetchPosts({
      postType: postType as PostType,
      keyword,
      subtype,
      page: page ?? 1,
      pageSize: PLAZA_AGENT_LIST_LIMIT,
    });
  },
});

export const plazaPostDetailTool = tool({
  name: "plaza_post_detail",
  description:
    "按帖子 id 查询广场帖子详情（只读，打开会计一次阅读）。结果以帖子卡片展示正文；不含作者署名。禁止用于发帖或删帖。",
  inputSchema: z.object({
    id: z.number().int().positive().describe("帖子 id"),
  }),
  render: { component: "PlazaPostDetailCard" },
  async execute({ id }) {
    return await fetchPostDetail(id);
  },
});

export const plazaTools = {
  plaza_posts_list: plazaPostsListTool,
  plaza_post_detail: plazaPostDetailTool,
};

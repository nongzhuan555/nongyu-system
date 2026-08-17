import type { PageResult } from "./users";

export type PostType = "announcement" | "feedback" | "courtyard";

export type ContentTabKey = "announcement" | "feedback" | "suggestion";

export type AdminPostItem = {
  id: number;
  postType: PostType;
  subtype: string;
  title: string;
  content: string;
  authorUserId: number;
  authorStudentNo: string;
  authorName: string;
  viewCount: number;
  uniqueReaderCount: number;
  coverageRate: number;
  publishedAt: string;
  deletedAt: string | null;
  /** 列表返回：未软删回复总数（含 admin_reply 与 comment） */
  replyCount?: number;
  /** 详情附加（feedback）：管理员单条回复（无则 null，含管理员实名） */
  adminReply?: AdminPostReply | null;
  /** 详情附加（courtyard）：顶层留言列表（含留言者实名） */
  comments?: AdminPostComment[];
};

/** 反馈墙管理员回复（管理端实名） */
export type AdminPostReply = {
  id: number;
  content: string;
  publishedAt: string;
  authorUserId: number;
  authorStudentNo: string;
  authorName: string;
};

/** 大院用户留言（管理端实名） */
export type AdminPostComment = {
  id: number;
  content: string;
  publishedAt: string;
  authorUserId: number;
  authorStudentNo: string;
  authorName: string;
};

export type AdminPostListQuery = {
  page?: number;
  pageSize?: number;
  postType?: PostType;
  subtype?: string;
  keyword?: string;
  includeDeleted?: boolean;
};

export type CreateAnnouncementBody = {
  subtype: string;
  title: string;
  content: string;
  publishedAt?: string;
};

export type PatchAnnouncementBody = {
  subtype?: string;
  title?: string;
  content?: string;
  publishedAt?: string;
};

export type AdminPostPage = PageResult<AdminPostItem>;

export function contentTabToPostType(tab: ContentTabKey): PostType {
  if (tab === "suggestion") return "courtyard";
  return tab;
}

export function postTypeToContentTab(postType: PostType): ContentTabKey {
  if (postType === "courtyard") return "suggestion";
  return postType;
}

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

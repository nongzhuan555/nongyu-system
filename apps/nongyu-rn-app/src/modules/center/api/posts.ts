import { appFetch } from "@/api/appClient";

export type PostType = "announcement" | "feedback" | "courtyard";

export type PostListItem = {
  id: number;
  postType: PostType;
  subtype: string;
  title: string;
  contentPreview: string;
  publishedAt: string;
  authorDisplayName?: string | null;
  viewCount?: number;
};

export type PostDetail = {
  id: number;
  postType: PostType;
  subtype: string;
  title: string;
  content: string;
  publishedAt: string;
  authorDisplayName?: string | null;
  isMine: boolean;
};

export type PageResult<T> = {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type LatestAnnouncement = {
  id: number;
  title: string;
  subtype: string;
  publishedAt: string;
};

/**
 * GET /api/app/posts —— 广场列表（可选 keyword 搜标题/正文）
 */
export async function fetchPosts(params: {
  postType: PostType;
  page?: number;
  pageSize?: number;
  subtype?: string;
  /** 1–64；空白视为未传 */
  keyword?: string;
}): Promise<PageResult<PostListItem>> {
  const q = new URLSearchParams({
    postType: params.postType,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  if (params.subtype) q.set("subtype", params.subtype);
  const keyword = params.keyword?.trim();
  if (keyword) q.set("keyword", keyword);
  return appFetch<PageResult<PostListItem>>(`/api/app/posts?${q.toString()}`);
}

/**
 * GET /api/app/posts/announcements/latest
 */
export async function fetchLatestAnnouncement(): Promise<LatestAnnouncement | null> {
  return appFetch<LatestAnnouncement | null>("/api/app/posts/announcements/latest", {
    allowNullData: true,
  });
}

/**
 * GET /api/app/posts/:id —— 详情（计阅读）
 */
export async function fetchPostDetail(id: number): Promise<PostDetail> {
  return appFetch<PostDetail>(`/api/app/posts/${id}`);
}

/**
 * POST /api/app/posts —— 发反馈/大院
 */
export async function createPost(body: {
  postType: "feedback" | "courtyard";
  subtype: string;
  title: string;
  content: string;
}): Promise<{ id: number }> {
  return appFetch<{ id: number }>("/api/app/posts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * DELETE /api/app/posts/:id
 */
export async function deletePost(id: number): Promise<void> {
  await appFetch<null>(`/api/app/posts/${id}`, {
    method: "DELETE",
    allowNullData: true,
  });
}

/**
 * GET /api/app/users/me/posts
 */
export async function fetchMyPosts(params?: {
  page?: number;
  pageSize?: number;
  postType?: "feedback" | "courtyard";
}): Promise<PageResult<PostListItem>> {
  const q = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.postType) q.set("postType", params.postType);
  return appFetch<PageResult<PostListItem>>(`/api/app/users/me/posts?${q.toString()}`);
}

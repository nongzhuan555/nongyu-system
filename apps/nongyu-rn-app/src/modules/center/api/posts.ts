import { appFetch } from "@/api/appClient";

export type PostType = "announcement" | "feedback" | "courtyard";

export type PostListItem = {
  id: number;
  postType: PostType;
  subtype: string;
  title: string;
  contentPreview: string;
  publishedAt: string;
  /** App 端恒为 null（反馈墙/大院匿名）；保留字段兼容接口 */
  authorDisplayName?: string | null;
  viewCount?: number;
  /** 「我的帖子」列表返回：未软删回复总数（含 admin_reply 与 comment） */
  replyCount?: number;
  /** 「我的帖子」列表返回：replyCount > 0 */
  hasReply?: boolean;
};

/** 反馈墙管理员回复（App 侧统一「管理员回复」，无作者信息） */
export type PostAdminReply = {
  content: string;
  publishedAt: string;
};

/** 大院用户留言（完全匿名，仅 isMine 自识） */
export type PostComment = {
  id: number;
  content: string;
  publishedAt: string;
  isMine: boolean;
};

export type PostDetail = {
  id: number;
  postType: PostType;
  subtype: string;
  title: string;
  content: string;
  publishedAt: string;
  /** App 端恒为 null（反馈墙/大院匿名） */
  authorDisplayName?: string | null;
  /** 仅供本人删帖，不向他人暴露作者身份 */
  isMine: boolean;
  /** 反馈墙：管理员单条回复（无则 null） */
  adminReply?: PostAdminReply | null;
  /** 大院：顶层留言列表（按 publishedAt ASC，软删剔除） */
  comments?: PostComment[];
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

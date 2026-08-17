import { appFetch } from "@/api/appClient";
import type { PostType } from "./posts";

/** 轮询「我的新回复」单项 */
export type NewPostReply = {
  replyId: number;
  postId: number;
  postType: PostType;
  postTitle: string;
  kind: "admin_reply" | "comment";
  content: string;
  createdAt: string;
};

/** 创建留言成功返回 */
export type CreatedComment = {
  id: number;
  content: string;
  publishedAt: string;
  isMine: true;
};

/**
 * POST /api/app/posts/:id/comments —— 大院帖下留言（仅 courtyard）
 */
export async function createComment(
  postId: number,
  body: { content: string },
): Promise<CreatedComment> {
  return appFetch<CreatedComment>(`/api/app/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * DELETE /api/app/posts/:id/comments/:commentId —— 删除自己的留言
 */
export async function deleteComment(postId: number, commentId: number): Promise<void> {
  await appFetch<null>(`/api/app/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
    allowNullData: true,
  });
}

/**
 * GET /api/app/users/me/post-replies/new —— 轮询当前用户帖子下未通知的新回复。
 * 服务端返回后置位 notified_author，后续轮询不再返回。
 */
export async function fetchNewPostReplies(): Promise<NewPostReply[]> {
  return appFetch<NewPostReply[]>("/api/app/users/me/post-replies/new");
}

/** 我的留言 / 收到的回复列表项（与 Node Spec 对齐） */
export type MyPostReplyListItem = {
  replyId: number;
  postId: number;
  postType: "feedback" | "courtyard";
  postTitle: string;
  kind: "admin_reply" | "comment";
  content: string;
  publishedAt: string;
};

type PageResult<T> = {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * GET /api/app/users/me/post-replies/received —— 收到的回复 inbox
 */
export async function fetchReceivedPostReplies(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PageResult<MyPostReplyListItem>> {
  const q = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  return appFetch<PageResult<MyPostReplyListItem>>(
    `/api/app/users/me/post-replies/received?${q.toString()}`,
  );
}

/**
 * GET /api/app/users/me/post-replies/sent —— 我对他人的留言
 */
export async function fetchSentPostReplies(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PageResult<MyPostReplyListItem>> {
  const q = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  return appFetch<PageResult<MyPostReplyListItem>>(
    `/api/app/users/me/post-replies/sent?${q.toString()}`,
  );
}

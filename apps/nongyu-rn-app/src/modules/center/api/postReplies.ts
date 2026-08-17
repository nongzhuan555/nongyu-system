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

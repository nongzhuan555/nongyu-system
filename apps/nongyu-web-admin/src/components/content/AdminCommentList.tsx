import { Button, Empty, Modal, Space, Tag, message } from "antd";
import { useState } from "react";
import { AdminApiError, deleteAdminPostComment } from "../../lib/adminApi";
import { formatAdminDateTime } from "../../lib/format";
import type { AdminPostComment } from "../../types/posts";

type AdminCommentListProps = {
  postId: number;
  comments: AdminPostComment[] | undefined;
  postDeleted: boolean;
  onChanged: () => void;
};

/**
 * 大院详情留言列表：实名展示 + 单条删除。
 */
export function AdminCommentList({
  postId,
  comments,
  postDeleted,
  onChanged,
}: AdminCommentListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function handleDelete(comment: AdminPostComment) {
    Modal.confirm({
      title: "删除留言",
      content: "删除后用户端不再可见，确定继续？",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        setDeletingId(comment.id);
        try {
          await deleteAdminPostComment(postId, comment.id);
          message.success("已删除留言");
          onChanged();
        } catch (err) {
          const text = err instanceof AdminApiError ? err.serverMessage : "删除失败，请稍后重试";
          message.error(text);
          throw err;
        } finally {
          setDeletingId(null);
        }
      },
    });
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="mt-4 rounded-xl bg-elev p-4">
        <span className="mb-2 block text-sm font-medium text-ink">留言</span>
        <Empty description="暂无留言" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl bg-elev p-4">
      <span className="mb-3 block text-sm font-medium text-ink">留言 · {comments.length}</span>
      <div className="flex flex-col gap-3">
        {comments.map((c) => (
          <div key={c.id} className="rounded-xl bg-white p-3 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <Space size={8} align="center">
                <Tag color="blue">留言</Tag>
                <span className="text-xs text-muted">
                  {c.authorName}（{c.authorStudentNo}）· {formatAdminDateTime(c.publishedAt)}
                </span>
              </Space>
              {!postDeleted && (
                <Button
                  size="small"
                  danger
                  onClick={() => handleDelete(c)}
                  loading={deletingId === c.id}
                >
                  删除
                </Button>
              )}
            </div>
            <div className="whitespace-pre-wrap text-sm text-ink">{c.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Button, Modal, Space, Tag, message } from "antd";
import { useState } from "react";
import { AdminApiError, deleteAdminPostReply } from "../../lib/adminApi";
import { formatAdminDateTime } from "../../lib/format";
import type { AdminPostReply } from "../../types/posts";
import { AdminReplyEditModal } from "./AdminReplyEditModal";

type AdminReplyPanelProps = {
  postId: number;
  reply: AdminPostReply | null | undefined;
  /** 帖子已软删时禁用操作 */
  postDeleted: boolean;
  onChanged: () => void;
};

/**
 * 反馈墙详情「管理员回复」区块：展示已有回复（含实名）+ 编辑/删除；无回复时展示添加入口。
 */
export function AdminReplyPanel({ postId, reply, postDeleted, onChanged }: AdminReplyPanelProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleDelete() {
    Modal.confirm({
      title: "删除管理员回复",
      content: "删除后用户端不再可见，确定继续？",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        setDeleting(true);
        try {
          await deleteAdminPostReply(postId);
          message.success("已删除回复");
          onChanged();
        } catch (err) {
          const text = err instanceof AdminApiError ? err.serverMessage : "删除失败，请稍后重试";
          message.error(text);
          throw err;
        } finally {
          setDeleting(false);
        }
      },
    });
  }

  if (!reply) {
    return (
      <div className="mt-4 rounded-xl bg-elev p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-ink">管理员回复</span>
          {!postDeleted && (
            <Button type="primary" size="small" onClick={() => setEditOpen(true)}>
              添加回复
            </Button>
          )}
        </div>
        <p className="text-sm text-muted">暂无回复</p>
        <AdminReplyEditModal
          open={editOpen}
          postId={postId}
          existingContent={null}
          onCancel={() => setEditOpen(false)}
          onSaved={onChanged}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl bg-elev p-4">
      <div className="mb-2 flex items-center justify-between">
        <Space size={8} align="center">
          <Tag color="green">管理员回复</Tag>
          <span className="text-xs text-muted">
            {reply.authorName}（{reply.authorStudentNo}）· {formatAdminDateTime(reply.publishedAt)}
          </span>
        </Space>
        {!postDeleted && (
          <Space size={8}>
            <Button size="small" onClick={() => setEditOpen(true)} disabled={deleting}>
              编辑
            </Button>
            <Button size="small" danger onClick={handleDelete} disabled={deleting}>
              删除
            </Button>
          </Space>
        )}
      </div>
      <div className="whitespace-pre-wrap text-sm text-ink">{reply.content}</div>
      <AdminReplyEditModal
        open={editOpen}
        postId={postId}
        existingContent={reply.content}
        onCancel={() => setEditOpen(false)}
        onSaved={onChanged}
      />
    </div>
  );
}

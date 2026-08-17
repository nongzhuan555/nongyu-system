import { Button, Descriptions, Drawer, Modal, Skeleton, Space, Tag, message } from "antd";
import { useEffect, useState } from "react";
import { AdminApiError, deleteAdminPost, fetchAdminPost } from "../../lib/adminApi";
import { displayText, formatAdminDateTime, formatCoverageRate } from "../../lib/format";
import { useDrawerWidth } from "../../lib/responsive";
import type { AdminPostItem } from "../../types/posts";
import { AdminCommentList } from "./AdminCommentList";
import { AdminReplyPanel } from "./AdminReplyPanel";

type PostDetailDrawerProps = {
  open: boolean;
  /** 列表行数据（用于即时展示与取 id）；详情字段以拉取的 detail 为准 */
  post: AdminPostItem | null;
  onClose: () => void;
  onDeleted: () => void;
  onEdit: (post: AdminPostItem) => void;
  /** 回复/留言变更后刷新列表（可选，用于同步 replyCount 列） */
  onReplyChanged?: () => void;
};

export function PostDetailDrawer({
  open,
  post,
  onClose,
  onDeleted,
  onEdit,
  onReplyChanged,
}: PostDetailDrawerProps) {
  const drawerWidth = useDrawerWidth(480);
  const [detail, setDetail] = useState<AdminPostItem | null>(null);
  const [loading, setLoading] = useState(false);

  const current = detail ?? post;
  const isAnnouncement = current?.postType === "announcement";
  const isDeleted = Boolean(current?.deletedAt);

  useEffect(() => {
    if (!open || !post) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchAdminPost(post.id)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (cancelled) return;
        const text = err instanceof AdminApiError ? err.serverMessage : "加载详情失败";
        message.error(text);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, post]);

  function refreshDetail() {
    if (!post) return;
    void fetchAdminPost(post.id)
      .then(setDetail)
      .catch(() => {});
    onReplyChanged?.();
  }

  function handleDelete() {
    if (!current || isDeleted) return;
    Modal.confirm({
      title: "删除内容",
      content: "删除后用户端不可见，确定继续？",
      okText: "确定",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteAdminPost(current.id);
          onDeleted();
          onClose();
        } catch (err) {
          const text = err instanceof AdminApiError ? err.serverMessage : "删除失败，请稍后重试";
          message.error(text);
          throw err;
        }
      },
    });
  }

  return (
    <Drawer title="内容详情" open={open} onClose={onClose} width={drawerWidth} destroyOnClose>
      {current ? (
        <div className="space-y-6">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="标题">{current.title}</Descriptions.Item>
            <Descriptions.Item label="类型">
              {current.postType === "announcement"
                ? "公告"
                : current.postType === "feedback"
                  ? "反馈"
                  : "建议"}
            </Descriptions.Item>
            <Descriptions.Item label="子类型">{displayText(current.subtype)}</Descriptions.Item>
            <Descriptions.Item label="作者">
              {current.authorName}（{current.authorStudentNo}）
            </Descriptions.Item>
            <Descriptions.Item label="发布时间">
              {formatAdminDateTime(current.publishedAt)}
            </Descriptions.Item>
            <Descriptions.Item label="阅读量">{current.viewCount}</Descriptions.Item>
            <Descriptions.Item label="独立读者">{current.uniqueReaderCount}</Descriptions.Item>
            <Descriptions.Item label="覆盖率">
              {formatCoverageRate(current.coverageRate)}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {isDeleted ? <Tag color="warning">已删除</Tag> : <Tag color="success">正常</Tag>}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">正文</p>
            <div className="whitespace-pre-wrap rounded-xl bg-elev p-4 text-sm text-ink">
              {current.content}
            </div>
          </div>

          {loading ? (
            <Skeleton active paragraph={{ rows: 3 }} />
          ) : current.postType === "feedback" ? (
            <AdminReplyPanel
              postId={current.id}
              reply={current.adminReply ?? null}
              postDeleted={isDeleted}
              onChanged={refreshDetail}
            />
          ) : current.postType === "courtyard" ? (
            <AdminCommentList
              postId={current.id}
              comments={current.comments}
              postDeleted={isDeleted}
              onChanged={refreshDetail}
            />
          ) : null}

          <Space wrap>
            {isAnnouncement && !isDeleted ? (
              <Button className="min-h-11" type="primary" onClick={() => onEdit(current)}>
                编辑
              </Button>
            ) : null}
            {!isDeleted ? (
              <Button className="min-h-11" danger onClick={handleDelete}>
                删除
              </Button>
            ) : null}
          </Space>
        </div>
      ) : null}
    </Drawer>
  );
}

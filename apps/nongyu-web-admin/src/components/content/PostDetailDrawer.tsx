import { Button, Descriptions, Drawer, Grid, Modal, Space, Tag, message } from "antd";
import { AdminApiError, deleteAdminPost } from "../../lib/adminApi";
import { displayText, formatAdminDateTime, formatCoverageRate } from "../../lib/format";
import type { AdminPostItem } from "../../types/posts";

type PostDetailDrawerProps = {
  open: boolean;
  post: AdminPostItem | null;
  onClose: () => void;
  onDeleted: () => void;
  onEdit: (post: AdminPostItem) => void;
};

export function PostDetailDrawer({
  open,
  post,
  onClose,
  onDeleted,
  onEdit,
}: PostDetailDrawerProps) {
  const screens = Grid.useBreakpoint();
  const isLg = screens.lg ?? true;
  const isAnnouncement = post?.postType === "announcement";
  const isDeleted = Boolean(post?.deletedAt);

  function handleDelete() {
    if (!post || isDeleted) return;
    Modal.confirm({
      title: "删除内容",
      content: "删除后用户端不可见，确定继续？",
      okText: "确定",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteAdminPost(post.id);
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
    <Drawer
      title="内容详情"
      open={open}
      onClose={onClose}
      width={isLg ? 480 : "100%"}
      destroyOnClose
    >
      {post ? (
        <div className="space-y-6">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="标题">{post.title}</Descriptions.Item>
            <Descriptions.Item label="类型">
              {post.postType === "announcement"
                ? "公告"
                : post.postType === "feedback"
                  ? "反馈"
                  : "建议"}
            </Descriptions.Item>
            <Descriptions.Item label="子类型">{displayText(post.subtype)}</Descriptions.Item>
            <Descriptions.Item label="作者">
              {post.authorName}（{post.authorStudentNo}）
            </Descriptions.Item>
            <Descriptions.Item label="发布时间">
              {formatAdminDateTime(post.publishedAt)}
            </Descriptions.Item>
            <Descriptions.Item label="阅读量">{post.viewCount}</Descriptions.Item>
            <Descriptions.Item label="独立读者">{post.uniqueReaderCount}</Descriptions.Item>
            <Descriptions.Item label="覆盖率">
              {formatCoverageRate(post.coverageRate)}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {isDeleted ? <Tag color="warning">已删除</Tag> : <Tag color="success">正常</Tag>}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">正文</p>
            <div className="whitespace-pre-wrap rounded-2xl bg-canvas p-4 text-sm text-ink">
              {post.content}
            </div>
          </div>

          <Space wrap>
            {isAnnouncement && !isDeleted ? (
              <Button className="min-h-11" type="primary" onClick={() => onEdit(post)}>
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

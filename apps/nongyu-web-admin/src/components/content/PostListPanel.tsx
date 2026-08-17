import { Alert, Button, Input, Switch, Table, Tag, Space, message } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useEffectEvent, useState } from "react";
import { AdminApiError, listAdminPosts } from "../../lib/adminApi";
import { DEFAULT_POST_PAGE_SIZE } from "../../lib/constants";
import { displayText, formatAdminDateTime, formatCoverageRate } from "../../lib/format";
import type { AdminPostItem, PostType } from "../../types/posts";
import { AnnouncementFormDrawer } from "./AnnouncementFormDrawer";
import { PostDetailDrawer } from "./PostDetailDrawer";

type PostListPanelProps = {
  postType: PostType;
  title: string;
  allowCreate: boolean;
};

export function PostListPanel({ postType, title, allowCreate }: PostListPanelProps) {
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [subtypeInput, setSubtypeInput] = useState("");
  const [subtype, setSubtype] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_POST_PAGE_SIZE);
  const [list, setList] = useState<AdminPostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<AdminPostItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPostItem | null>(null);

  const loadList = useEffectEvent(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminPosts({
        page,
        pageSize,
        postType,
        keyword: keyword.trim() || undefined,
        subtype: subtype.trim() || undefined,
        includeDeleted: includeDeleted || undefined,
      });
      setList(data.list);
      setTotal(data.total);
    } catch (err) {
      setList([]);
      setTotal(0);
      if (err instanceof AdminApiError) {
        setError(
          err.code === 40302
            ? "当前会话无权管理内容，请先在农屿 App 使用该学号登录完成建档。"
            : err.serverMessage,
        );
      } else {
        setError("网络异常，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void loadList();
  }, [page, pageSize, keyword, subtype, includeDeleted, postType]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword((prev) => {
        if (prev === keywordInput) return prev;
        setPage(1);
        return keywordInput;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSubtype((prev) => {
        if (prev === subtypeInput) return prev;
        setPage(1);
        return subtypeInput;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [subtypeInput]);

  const columns: ColumnsType<AdminPostItem> = [
    {
      title: "标题",
      dataIndex: "title",
      ellipsis: true,
      width: 200,
      fixed: "left",
    },
    {
      title: "子类型",
      dataIndex: "subtype",
      width: 110,
      render: (value: string) => displayText(value),
    },
    {
      title: "作者",
      width: 160,
      responsive: ["md"],
      render: (_, row) => `${row.authorName}（${row.authorStudentNo}）`,
    },
    {
      title: "发布时间",
      dataIndex: "publishedAt",
      width: 160,
      render: (value: string) => formatAdminDateTime(value),
    },
    {
      title: "阅读量",
      dataIndex: "viewCount",
      width: 90,
      responsive: ["lg"],
    },
    {
      title: "覆盖率",
      dataIndex: "coverageRate",
      width: 100,
      responsive: ["lg"],
      render: (value: number) => formatCoverageRate(value),
    },
    {
      title: "回复",
      width: 100,
      responsive: ["md"],
      render: (_, row) => {
        if (row.postType === "announcement") return <span className="text-muted">—</span>;
        const count = row.replyCount ?? 0;
        if (row.postType === "feedback") {
          return count > 0 ? <Tag color="success">已回复</Tag> : <Tag>未回复</Tag>;
        }
        return <span className="text-sm text-ink">{count} 条留言</span>;
      },
    },
    {
      title: "状态",
      width: 90,
      render: (_, row) =>
        row.deletedAt ? <Tag color="warning">已删除</Tag> : <Tag color="success">正常</Tag>,
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
        </div>
        <Space wrap>
          <Input
            allowClear
            className="w-48"
            placeholder="搜索标题 / 正文"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
          />
          {postType === "announcement" ? (
            <Input
              allowClear
              className="w-36"
              placeholder="子类型精确筛选"
              value={subtypeInput}
              onChange={(event) => setSubtypeInput(event.target.value)}
            />
          ) : null}
          <Space>
            <span className="text-sm text-muted">含已删除</span>
            <Switch
              checked={includeDeleted}
              onChange={(checked) => {
                setIncludeDeleted(checked);
                setPage(1);
              }}
            />
          </Space>
          {allowCreate ? (
            <Button
              type="primary"
              className="min-h-11"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              发布公告
            </Button>
          ) : null}
        </Space>
      </div>

      {error ? (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          message={error}
          action={
            <Button
              size="small"
              onClick={() => {
                void loadList();
              }}
            >
              重试
            </Button>
          }
        />
      ) : null}

      <Table<AdminPostItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        scroll={{ x: 900 }}
        locale={{ emptyText: "暂无内容" }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count) => `共 ${count} 条`,
        }}
        onChange={(pagination: TablePaginationConfig) => {
          setPage(pagination.current ?? 1);
          setPageSize(pagination.pageSize ?? DEFAULT_POST_PAGE_SIZE);
        }}
        onRow={(record) => ({
          onClick: () => {
            setSelected(record);
            setDetailOpen(true);
          },
          className: "cursor-pointer",
        })}
      />

      <PostDetailDrawer
        open={detailOpen}
        post={selected}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        onDeleted={() => {
          message.success("已删除");
          void loadList();
        }}
        onReplyChanged={() => {
          void loadList();
        }}
        onEdit={(post) => {
          setDetailOpen(false);
          setEditing(post);
          setFormOpen(true);
        }}
      />

      <AnnouncementFormDrawer
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          void loadList();
        }}
      />
    </div>
  );
}

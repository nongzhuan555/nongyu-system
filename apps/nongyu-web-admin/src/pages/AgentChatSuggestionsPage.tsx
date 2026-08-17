import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useEffectEvent, useState } from "react";
import {
  AdminApiError,
  createAdminAgentChatSuggestion,
  deleteAdminAgentChatSuggestion,
  listAdminAgentChatSuggestions,
  patchAdminAgentChatSuggestion,
} from "../lib/adminApi";
import { PageFrame } from "../components/layout/PageFrame";
import { useForegroundRefresh } from "../hooks/useForegroundRefresh";
import {
  DEFAULT_AGENT_CHAT_SUGGESTION_PAGE_SIZE,
  FOREGROUND_REFRESH_INTERVAL_MS,
} from "../lib/constants";
import { formatAdminDateTime } from "../lib/format";
import { useModalWidth } from "../lib/responsive";
import type { AdminAgentChatSuggestionItem } from "../types/agentChatSuggestions";

type EnabledFilter = "all" | 0 | 1;

type FormValues = {
  text: string;
  enabled: boolean;
  sortOrder: number;
};

/**
 * App AI 空态快捷建议运营配置（可多条同时启用）
 */
export function AgentChatSuggestionsPage() {
  const modalWidth = useModalWidth(520);
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_AGENT_CHAT_SUGGESTION_PAGE_SIZE);
  const [list, setList] = useState<AdminAgentChatSuggestionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAgentChatSuggestionItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const loadList = useEffectEvent(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await listAdminAgentChatSuggestions({
        page,
        pageSize,
        enabled: enabledFilter === "all" ? undefined : enabledFilter,
      });
      setList(data.list);
      setTotal(data.total);
      if (silent) setError(null);
    } catch (err) {
      if (silent) return;
      setList([]);
      setTotal(0);
      if (err instanceof AdminApiError) {
        setError(
          err.code === 40302
            ? "当前会话无权管理 AI 建议，请先在农屿 App 使用该学号登录完成建档。"
            : err.serverMessage,
        );
      } else {
        setError("网络异常，请稍后重试");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  });

  useEffect(() => {
    void loadList();
  }, [page, pageSize, enabledFilter]);

  useForegroundRefresh(() => void loadList(true), {
    intervalMs: FOREGROUND_REFRESH_INTERVAL_MS,
    enabled: !modalOpen,
  });

  function openCreate() {
    setEditing(null);
    form.setFieldsValue({ text: "", enabled: false, sortOrder: 0 });
    setModalOpen(true);
  }

  function openEdit(row: AdminAgentChatSuggestionItem) {
    setEditing(row);
    form.setFieldsValue({
      text: row.text,
      enabled: row.enabled,
      sortOrder: row.sortOrder,
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const text = values.text.trim();
      if (editing) {
        await patchAdminAgentChatSuggestion(editing.id, {
          text,
          enabled: values.enabled,
          sortOrder: values.sortOrder,
        });
        message.success("已保存");
      } else {
        await createAdminAgentChatSuggestion({
          text,
          enabled: values.enabled,
          sortOrder: values.sortOrder,
        });
        message.success("已创建");
      }
      setModalOpen(false);
      void loadList();
    } catch (err) {
      message.error(err instanceof AdminApiError ? err.serverMessage : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleEnabled(row: AdminAgentChatSuggestionItem) {
    try {
      await patchAdminAgentChatSuggestion(row.id, { enabled: !row.enabled });
      message.success(row.enabled ? "已禁用" : "已启用");
      void loadList();
    } catch (err) {
      message.error(err instanceof AdminApiError ? err.serverMessage : "操作失败");
    }
  }

  function confirmDelete(row: AdminAgentChatSuggestionItem) {
    Modal.confirm({
      title: "删除建议",
      content: `确认删除「${row.text}」？此操作不可恢复。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteAdminAgentChatSuggestion(row.id);
          message.success("已删除");
          void loadList();
        } catch (err) {
          message.error(err instanceof AdminApiError ? err.serverMessage : "删除失败");
          throw err;
        }
      },
    });
  }

  const columns: ColumnsType<AdminAgentChatSuggestionItem> = [
    {
      title: "建议文案",
      dataIndex: "text",
      ellipsis: true,
    },
    {
      title: "排序",
      dataIndex: "sortOrder",
      width: 88,
    },
    {
      title: "状态",
      dataIndex: "enabled",
      width: 100,
      render: (value: boolean) => (value ? <Tag color="success">启用中</Tag> : <Tag>未启用</Tag>),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      width: 180,
      responsive: ["md"],
      render: (value: string) => formatAdminDateTime(value),
    },
    {
      title: "操作",
      width: 220,
      fixed: "right",
      render: (_: unknown, row) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => void toggleEnabled(row)}>
            {row.enabled ? "禁用" : "启用"}
          </Button>
          <Button type="link" size="small" danger onClick={() => confirmDelete(row)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize,
    total,
    showSizeChanger: true,
    onChange: (nextPage, nextSize) => {
      setPage(nextPage);
      setPageSize(nextSize);
    },
  };

  return (
    <PageFrame
      title="AI 建议"
      description="配置 App AI 聊天空态快捷建议；可多条同时启用，App 按排序展示最多 6 条。"
      actions={
        <>
          <Select
            value={enabledFilter}
            className="w-full sm:w-[140px]"
            options={[
              { value: "all", label: "全部状态" },
              { value: 1, label: "启用" },
              { value: 0, label: "禁用" },
            ]}
            onChange={(value: EnabledFilter) => {
              setPage(1);
              setEnabledFilter(value);
            }}
          />
          <Button onClick={() => void loadList()}>刷新</Button>
          <Button type="primary" onClick={openCreate}>
            新建建议
          </Button>
        </>
      }
    >
      {error ? (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={() => void loadList()}>
              重试
            </Button>
          }
        />
      ) : null}

      <Table
        rowKey="id"
        loading={loading}
        size="middle"
        columns={columns}
        dataSource={list}
        pagination={pagination}
        scroll={{ x: 780 }}
        locale={{ emptyText: "暂无建议，请新建" }}
      />

      <Modal
        title={editing ? "编辑建议" : "新建建议"}
        open={modalOpen}
        width={modalWidth}
        centered
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleSubmit()}
        confirmLoading={submitting}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
          <Form.Item
            name="text"
            label="建议文案"
            rules={[
              { required: true, message: "请输入建议文案" },
              { max: 24, message: "最多 24 字" },
              {
                validator: async (_, value: string) => {
                  if (value != null && !String(value).trim()) {
                    throw new Error("建议文案不能为空");
                  }
                },
              },
            ]}
            extra="用户点选后将作为首条消息发出；建议短指令"
          >
            <Input.TextArea rows={2} maxLength={24} showCount placeholder="如：查一下我的成绩" />
          </Form.Item>
          <Form.Item
            name="sortOrder"
            label="排序"
            rules={[{ required: true, message: "请输入排序值" }]}
            extra="数字越小越靠前；相同时按创建先后"
          >
            <InputNumber className="w-full" precision={0} />
          </Form.Item>
          <Form.Item name="enabled" label="立即启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageFrame>
  );
}

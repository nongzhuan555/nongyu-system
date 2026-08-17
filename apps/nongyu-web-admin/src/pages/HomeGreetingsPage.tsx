import {
  Alert,
  Button,
  Form,
  Input,
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
  createAdminHomeGreeting,
  deleteAdminHomeGreeting,
  listAdminHomeGreetings,
  patchAdminHomeGreeting,
} from "../lib/adminApi";
import { DEFAULT_HOME_GREETING_PAGE_SIZE } from "../lib/constants";
import { formatAdminDateTime } from "../lib/format";
import type { AdminHomeGreetingItem } from "../types/homeGreetings";

type EnabledFilter = "all" | 0 | 1;

type FormValues = {
  message: string;
  enabled: boolean;
};

/**
 * 首页 App 打招呼第二句运营配置
 */
export function HomeGreetingsPage() {
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_HOME_GREETING_PAGE_SIZE);
  const [list, setList] = useState<AdminHomeGreetingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminHomeGreetingItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const loadList = useEffectEvent(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminHomeGreetings({
        page,
        pageSize,
        enabled: enabledFilter === "all" ? undefined : enabledFilter,
      });
      setList(data.list);
      setTotal(data.total);
    } catch (err) {
      setList([]);
      setTotal(0);
      if (err instanceof AdminApiError) {
        setError(
          err.code === 40302
            ? "当前会话无权管理问候语，请先在农屿 App 使用该学号登录完成建档。"
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
  }, [page, pageSize, enabledFilter]);

  function openCreate() {
    setEditing(null);
    form.setFieldsValue({ message: "", enabled: false });
    setModalOpen(true);
  }

  function openEdit(row: AdminHomeGreetingItem) {
    setEditing(row);
    form.setFieldsValue({ message: row.message, enabled: row.enabled });
    setModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const messageText = values.message.trim();
      if (editing) {
        await patchAdminHomeGreeting(editing.id, {
          message: messageText,
          enabled: values.enabled,
        });
        message.success("已保存");
      } else {
        await createAdminHomeGreeting({
          message: messageText,
          enabled: values.enabled,
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

  async function toggleEnabled(row: AdminHomeGreetingItem) {
    try {
      await patchAdminHomeGreeting(row.id, { enabled: !row.enabled });
      message.success(row.enabled ? "已禁用" : "已启用（其它启用项将自动关闭）");
      void loadList();
    } catch (err) {
      message.error(err instanceof AdminApiError ? err.serverMessage : "操作失败");
    }
  }

  function confirmDelete(row: AdminHomeGreetingItem) {
    Modal.confirm({
      title: "删除问候语",
      content: `确认删除「${row.message}」？此操作不可恢复。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteAdminHomeGreeting(row.id);
          message.success("已删除");
          void loadList();
        } catch (err) {
          message.error(err instanceof AdminApiError ? err.serverMessage : "删除失败");
          throw err;
        }
      },
    });
  }

  const columns: ColumnsType<AdminHomeGreetingItem> = [
    {
      title: "问候语",
      dataIndex: "message",
      ellipsis: true,
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
    <div className="rounded-3xl bg-white p-4 shadow-card md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink">首页问候</h2>
        <p className="mt-1 text-sm text-muted">
          配置 App 首页打招呼第二句；全局最多一条启用，启用新的会自动关掉旧的。
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Space wrap>
          <Select
            value={enabledFilter}
            style={{ width: 140 }}
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
        </Space>
        <Button type="primary" className="min-h-11" onClick={openCreate}>
          新建问候语
        </Button>
      </div>

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
        columns={columns}
        dataSource={list}
        pagination={pagination}
        scroll={{ x: 720 }}
        locale={{ emptyText: "暂无问候语，请新建" }}
      />

      <Modal
        title={editing ? "编辑问候语" : "新建问候语"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleSubmit()}
        confirmLoading={submitting}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
          <Form.Item
            name="message"
            label="问候语"
            rules={[
              { required: true, message: "请输入问候语" },
              { max: 48, message: "最多 48 字" },
              {
                validator: async (_, value: string) => {
                  if (value != null && !String(value).trim()) {
                    throw new Error("问候语不能为空");
                  }
                },
              },
            ]}
            extra="将接在「姓名，晚上好」之后（中文逗号分隔）；建议控制长度避免折行过多"
          >
            <Input.TextArea rows={3} maxLength={48} showCount placeholder="如：祝你今天学习顺利" />
          </Form.Item>
          <Form.Item
            name="enabled"
            label="立即启用"
            valuePropName="checked"
            extra="开启后会自动关闭其它已启用条目"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

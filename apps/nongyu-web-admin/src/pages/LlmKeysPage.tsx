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
  Tabs,
  Tag,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useEffectEvent, useState } from "react";
import { LlmProxyFailsPanel } from "../components/llm/LlmProxyFailsPanel";
import { PageFrame } from "../components/layout/PageFrame";
import { useForegroundRefresh } from "../hooks/useForegroundRefresh";
import {
  AdminApiError,
  createAdminLlmKey,
  deleteAdminLlmKey,
  listAdminLlmKeys,
  patchAdminLlmKey,
} from "../lib/adminApi";
import { DEFAULT_LLM_KEY_PAGE_SIZE, FOREGROUND_REFRESH_INTERVAL_MS } from "../lib/constants";
import { formatAdminDateTime } from "../lib/format";
import { useModalWidth } from "../lib/responsive";
import type { AdminLlmKeyItem, LlmKeyStatus } from "../types/llmKeys";

type StatusFilter = "all" | LlmKeyStatus;

type FormValues = {
  name: string;
  accountGroup: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxConcurrent: number;
  weight: number;
  status: boolean;
};

export function LlmKeysPage() {
  const modalWidth = useModalWidth(560);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LLM_KEY_PAGE_SIZE);
  const [list, setList] = useState<AdminLlmKeyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLlmKeyItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"keys" | "fails">("keys");
  const [form] = Form.useForm<FormValues>();

  const loadList = useEffectEvent(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await listAdminLlmKeys({
        page,
        pageSize,
        status: status === "all" ? undefined : status,
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
            ? "当前会话无权管理密钥，请先在农屿 App 使用该学号登录完成建档。"
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
  }, [page, pageSize, status]);

  useForegroundRefresh(() => void loadList(true), {
    intervalMs: FOREGROUND_REFRESH_INTERVAL_MS,
    enabled: !modalOpen,
  });

  function openCreate() {
    setEditing(null);
    form.setFieldsValue({
      name: "",
      accountGroup: "",
      apiKey: "",
      baseUrl: "",
      model: "",
      maxConcurrent: 1,
      weight: 1,
      status: true,
    });
    setModalOpen(true);
  }

  function openEdit(row: AdminLlmKeyItem) {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      accountGroup: row.accountGroup,
      apiKey: undefined,
      baseUrl: row.baseUrl ?? "",
      model: row.model ?? "",
      maxConcurrent: row.maxConcurrent,
      weight: row.weight,
      status: row.status === 1,
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) {
        await patchAdminLlmKey(editing.id, {
          name: values.name.trim(),
          accountGroup: values.accountGroup.trim(),
          baseUrl: values.baseUrl?.trim() || null,
          model: values.model?.trim() || null,
          maxConcurrent: values.maxConcurrent,
          weight: values.weight,
          status: values.status ? 1 : 0,
          apiKey: values.apiKey?.trim() || undefined,
        });
        message.success("已保存");
      } else {
        const apiKey = values.apiKey?.trim();
        if (!apiKey) {
          message.error("请填写 API Key");
          return;
        }
        await createAdminLlmKey({
          name: values.name.trim(),
          accountGroup: values.accountGroup.trim(),
          apiKey,
          baseUrl: values.baseUrl?.trim() || null,
          model: values.model?.trim() || null,
          maxConcurrent: values.maxConcurrent,
          weight: values.weight,
          status: values.status ? 1 : 0,
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

  async function toggleStatus(row: AdminLlmKeyItem) {
    try {
      await patchAdminLlmKey(row.id, { status: row.status === 1 ? 0 : 1 });
      message.success(row.status === 1 ? "已禁用" : "已启用");
      void loadList();
    } catch (err) {
      message.error(err instanceof AdminApiError ? err.serverMessage : "操作失败");
    }
  }

  function confirmDelete(row: AdminLlmKeyItem) {
    Modal.confirm({
      title: "删除密钥",
      content: `确认删除「${row.name}」（****${row.apiKeySuffix}）？此操作不可恢复。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteAdminLlmKey(row.id);
          message.success("已删除");
          void loadList();
        } catch (err) {
          message.error(err instanceof AdminApiError ? err.serverMessage : "删除失败");
          throw err;
        }
      },
    });
  }

  const columns: ColumnsType<AdminLlmKeyItem> = [
    { title: "名称", dataIndex: "name", width: 140, fixed: "left" },
    { title: "账号组", dataIndex: "accountGroup", width: 120 },
    {
      title: "Key",
      dataIndex: "apiKeySuffix",
      width: 100,
      render: (suffix: string) => `****${suffix}`,
    },
    {
      title: "模型",
      dataIndex: "model",
      width: 140,
      render: (value: string | null) => (value && value.trim() ? value : "默认"),
    },
    { title: "并发", dataIndex: "maxConcurrent", width: 70 },
    { title: "权重", dataIndex: "weight", width: 70 },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (value: LlmKeyStatus) =>
        value === 1 ? <Tag color="success">启用</Tag> : <Tag>禁用</Tag>,
    },
    {
      title: "占用",
      dataIndex: "inFlight",
      width: 70,
      render: (value: number | undefined) => (value == null ? "—" : value),
    },
    {
      title: "冷却",
      width: 100,
      render: (_: unknown, row) =>
        row.cooling ? <Tag color="warning">冷却中</Tag> : <Tag color="default">否</Tag>,
    },
    {
      title: "成功/失败",
      width: 110,
      render: (_: unknown, row) => `${row.successCount}/${row.failCount}`,
    },
    {
      title: "最近使用",
      dataIndex: "lastUsedAt",
      width: 170,
      responsive: ["lg"],
      render: (value: string | null) => formatAdminDateTime(value),
    },
    {
      title: "操作",
      width: 200,
      fixed: "right",
      render: (_: unknown, row) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => void toggleStatus(row)}>
            {row.status === 1 ? "禁用" : "启用"}
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

  const isKeysTab = tab === "keys";

  return (
    <PageFrame
      title="LLM Key 池"
      description="管理代理密钥与失败记录"
      actions={
        isKeysTab ? (
          <Button type="primary" onClick={openCreate}>
            添加密钥
          </Button>
        ) : null
      }
    >
      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key === "fails" ? "fails" : "keys")}
        items={[
          {
            key: "keys",
            label: "密钥管理",
            children: (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <Select
                    value={status}
                    className="w-full sm:w-[140px]"
                    options={[
                      { value: "all", label: "全部状态" },
                      { value: 1, label: "启用" },
                      { value: 0, label: "禁用" },
                    ]}
                    onChange={(value: StatusFilter) => {
                      setPage(1);
                      setStatus(value);
                    }}
                  />
                  <Button onClick={() => void loadList()}>刷新</Button>
                </div>

                {error ? (
                  <Alert
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
                  scroll={{ x: 1200 }}
                  locale={{ emptyText: "暂无密钥，请添加" }}
                />
              </div>
            ),
          },
          {
            key: "fails",
            label: "失败记录",
            children: <LlmProxyFailsPanel />,
          },
        ]}
      />

      <Modal
        title={editing ? "编辑密钥" : "添加密钥"}
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
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入名称" }]}>
            <Input maxLength={64} placeholder="如：智谱账号A-key1" />
          </Form.Item>
          <Form.Item
            name="accountGroup"
            label="账号组"
            rules={[{ required: true, message: "请输入账号组" }]}
            extra="同一智谱账号下的 Key 请使用相同账号组，共享并发预算"
          >
            <Input maxLength={64} placeholder="如：zhipu-account-1" />
          </Form.Item>
          <Form.Item
            name="apiKey"
            label="API Key"
            rules={editing ? [] : [{ required: true, message: "请输入 API Key" }]}
            extra={editing ? "留空则不修改密钥" : undefined}
          >
            <Input.Password placeholder={editing ? "留空则不修改" : "粘贴智谱 API Key"} />
          </Form.Item>
          <Form.Item name="baseUrl" label="Base URL（可选）">
            <Input placeholder="默认使用服务端全局地址" />
          </Form.Item>
          <Form.Item name="model" label="模型（可选）">
            <Input placeholder="默认使用服务端全局模型" />
          </Form.Item>
          <Form.Item name="maxConcurrent" label="最大并发" rules={[{ required: true }]}>
            <InputNumber min={1} max={32} className="w-full" />
          </Form.Item>
          <Form.Item name="weight" label="权重" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} className="w-full" />
          </Form.Item>
          <Form.Item name="status" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageFrame>
  );
}

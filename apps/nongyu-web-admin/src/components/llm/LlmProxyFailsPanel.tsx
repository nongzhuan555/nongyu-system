import { Alert, Button, DatePicker, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useEffectEvent, useState } from "react";
import { AdminApiError, fetchTrackLlmProxyFails } from "../../lib/adminApi";
import { displayText, formatAdminDateTime } from "../../lib/format";
import type { TrackCrashItem } from "../../types/dashboard";

type ErrorCodeFilter = "all" | "50210" | "50310" | "50311" | "42910" | "42911";

const CODE_LABEL: Record<Exclude<ErrorCodeFilter, "all">, string> = {
  "50210": "上游失败",
  "50310": "池不可用",
  "50311": "排队繁忙",
  "42910": "日限额",
  "42911": "用户忙",
};

function attemptsSummary(props: Record<string, unknown> | null): string {
  if (!props) return "—";
  const attempts = props.attempts;
  if (!Array.isArray(attempts) || attempts.length === 0) return "—";
  return `${attempts.length} 次尝试`;
}

function errorMessage(props: Record<string, unknown> | null): string {
  if (!props) return "—";
  const msg = props.error_message;
  return typeof msg === "string" && msg.trim() ? msg : "—";
}

export function LlmProxyFailsPanel() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => {
    const today = dayjs();
    return [today.subtract(6, "day"), today];
  });
  const [errorCode, setErrorCode] = useState<ErrorCodeFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [list, setList] = useState<TrackCrashItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<TrackCrashItem | null>(null);

  const loadList = useEffectEvent(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrackLlmProxyFails({
        from: range[0].format("YYYY-MM-DD"),
        to: range[1].format("YYYY-MM-DD"),
        page,
        pageSize,
        errorCode: errorCode === "all" ? undefined : errorCode,
      });
      setList(data.list);
      setTotal(data.total);
    } catch (err) {
      setList([]);
      setTotal(0);
      if (err instanceof AdminApiError) {
        setError(err.serverMessage);
      } else {
        setError("网络异常，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void loadList();
  }, [range, errorCode, page, pageSize]);

  const columns: ColumnsType<TrackCrashItem> = [
    {
      title: "时间",
      dataIndex: "receivedAtMs",
      width: 160,
      render: (value: number) => formatAdminDateTime(dayjs(value).toISOString()),
    },
    {
      title: "学号",
      dataIndex: "studentNo",
      width: 120,
      render: (value: string | null) => displayText(value),
    },
    {
      title: "用户 ID",
      dataIndex: "userId",
      width: 90,
      render: (value: number | null) => (value == null ? "—" : value),
    },
    {
      title: "错误码",
      dataIndex: "eventName",
      width: 140,
      render: (value: string) => {
        const label = CODE_LABEL[value as keyof typeof CODE_LABEL];
        return <Tag color="error">{label ? `${value} ${label}` : value}</Tag>;
      },
    },
    {
      title: "摘要",
      key: "msg",
      ellipsis: true,
      render: (_: unknown, row) => errorMessage(row.props),
    },
    {
      title: "模型",
      width: 130,
      render: (_: unknown, row) => {
        const model = row.props?.model;
        return typeof model === "string" ? model : "—";
      },
    },
    {
      title: "流式",
      width: 70,
      render: (_: unknown, row) => {
        const stream = row.props?.stream;
        if (typeof stream !== "boolean") return "—";
        return stream ? "是" : "否";
      },
    },
    {
      title: "Attempts",
      width: 100,
      render: (_: unknown, row) => attemptsSummary(row.props),
    },
    {
      title: "操作",
      width: 80,
      fixed: "right",
      render: (_: unknown, row) => (
        <Button type="link" size="small" onClick={() => setDetail(row)}>
          明细
        </Button>
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
    <div className="flex flex-col gap-4">
      <Space wrap>
        <DatePicker.RangePicker
          value={range}
          allowClear={false}
          onChange={(values) => {
            if (!values?.[0] || !values[1]) return;
            setPage(1);
            setRange([values[0], values[1]]);
          }}
        />
        <Select
          value={errorCode}
          style={{ width: 180 }}
          options={[
            { value: "all", label: "全部错误码" },
            ...Object.entries(CODE_LABEL).map(([value, label]) => ({
              value,
              label: `${value} ${label}`,
            })),
          ]}
          onChange={(value: ErrorCodeFilter) => {
            setPage(1);
            setErrorCode(value);
          }}
        />
        <Button onClick={() => void loadList()}>刷新</Button>
      </Space>

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
        rowKey="eventId"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={pagination}
        scroll={{ x: 1100 }}
        locale={{ emptyText: "所选范围内暂无平台模型失败记录" }}
      />

      <Modal
        title="失败明细"
        open={detail != null}
        onCancel={() => setDetail(null)}
        footer={null}
        width={720}
        destroyOnClose
      >
        {detail ? (
          <pre className="max-h-[60vh] overflow-auto rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
            {JSON.stringify(
              {
                eventId: detail.eventId,
                userId: detail.userId,
                studentNo: detail.studentNo,
                errorCode: detail.eventName,
                receivedAtMs: detail.receivedAtMs,
                props: detail.props,
              },
              null,
              2,
            )}
          </pre>
        ) : null}
      </Modal>
    </div>
  );
}

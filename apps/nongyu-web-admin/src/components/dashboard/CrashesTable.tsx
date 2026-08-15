import { Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { displayText, formatAdminEpochMs } from "../../lib/format";
import type { TrackCrashItem, TrackCrashPage } from "../../types/dashboard";

function crashText(props: Record<string, unknown> | null, key: string): string {
  if (!props) return "—";
  const value = props[key];
  return typeof value === "string" && value.trim() ? value : "—";
}

const columns: ColumnsType<TrackCrashItem> = [
  {
    title: "时间",
    dataIndex: "receivedAtMs",
    width: 148,
    render: (ms: number) => formatAdminEpochMs(ms),
  },
  { title: "事件", dataIndex: "eventName", width: 120, ellipsis: true },
  {
    title: "学号",
    dataIndex: "studentNo",
    width: 110,
    render: (value: string | null) => displayText(value),
  },
  {
    title: "版本",
    dataIndex: "appVersion",
    width: 88,
    render: (value: string | null) => displayText(value),
  },
  {
    title: "平台",
    dataIndex: "platform",
    width: 88,
    render: (value: string | null) => displayText(value),
  },
  {
    title: "品牌",
    dataIndex: "deviceBrand",
    width: 88,
    render: (value: string | null) => displayText(value),
  },
  {
    title: "信息",
    key: "message",
    ellipsis: true,
    render: (_, row) => {
      const message = crashText(row.props, "message");
      const stack = crashText(row.props, "stack");
      const full = stack !== "—" ? `${message}\n${stack.slice(0, 2048)}` : message;
      return (
        <Tooltip title={<pre className="max-h-64 overflow-auto whitespace-pre-wrap">{full}</pre>}>
          <span>{message}</span>
        </Tooltip>
      );
    },
  },
];

export function CrashesTable({
  data,
  loading,
  onPageChange,
}: {
  data: TrackCrashPage | null;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <Table<TrackCrashItem>
      size="small"
      rowKey="eventId"
      loading={loading}
      columns={columns}
      dataSource={data?.list ?? []}
      scroll={{ x: 720, y: 220 }}
      pagination={{
        current: data?.page ?? 1,
        pageSize: data?.pageSize ?? 10,
        total: data?.total ?? 0,
        showSizeChanger: false,
        onChange: onPageChange,
      }}
    />
  );
}

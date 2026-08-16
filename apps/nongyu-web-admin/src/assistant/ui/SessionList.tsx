import { Button, Popconfirm } from "antd";
import dayjs from "dayjs";
import type { AgentChatSession } from "../storage/sessionTypes";

function groupLabel(ts: number): string {
  const d = dayjs(ts);
  if (d.isSame(dayjs(), "day")) return "今天";
  if (d.isSame(dayjs().subtract(1, "day"), "day")) return "昨天";
  return "更早";
}

export function SessionList({
  sessions,
  activeId,
  onSelect,
  onDelete,
  onClearAll,
  onNew,
}: {
  sessions: AgentChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onNew: () => void;
}) {
  const groups = new Map<string, AgentChatSession[]>();
  for (const s of sessions) {
    const label = groupLabel(s.updatedAt);
    const list = groups.get(label) ?? [];
    list.push(s);
    groups.set(label, list);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button className="min-h-11 flex-1" onClick={onNew}>
          新对话
        </Button>
        <Popconfirm title="清空全部对话？" onConfirm={onClearAll}>
          <Button className="min-h-11" danger disabled={sessions.length === 0}>
            清空
          </Button>
        </Popconfirm>
      </div>
      {[...groups.entries()].map(([label, items]) => (
        <div key={label}>
          <p className="mb-1 text-xs text-muted">{label}</p>
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-1">
                <button
                  type="button"
                  className={`min-h-11 flex-1 truncate rounded-xl px-3 text-left text-sm ${
                    item.id === activeId ? "bg-brand/10 text-brand" : "bg-canvas"
                  }`}
                  onClick={() => onSelect(item.id)}
                >
                  {item.title}
                </button>
                <Button size="small" danger type="text" onClick={() => onDelete(item.id)}>
                  删
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

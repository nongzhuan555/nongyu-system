import { Popconfirm } from "antd";
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
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          className="min-h-11 flex-1 rounded-xl bg-brand px-3 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          onClick={onNew}
        >
          新对话
        </button>
        <Popconfirm title="清空全部对话？" onConfirm={onClearAll}>
          <button
            type="button"
            disabled={sessions.length === 0}
            className="min-h-11 rounded-xl border border-line-soft px-3 text-sm text-red-600 transition-colors hover:bg-elev disabled:opacity-40"
          >
            清空
          </button>
        </Popconfirm>
      </div>
      {sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">暂无会话</p>
      ) : (
        [...groups.entries()].map(([label, items]) => (
          <div key={label}>
            <p className="mb-2 px-1 text-xs font-medium text-muted">{label}</p>
            <ul className="flex flex-col gap-1.5">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    className={`min-h-11 flex-1 truncate rounded-xl px-3 text-left text-sm transition-colors ${
                      item.id === activeId
                        ? "bg-brand-muted font-medium text-brand"
                        : "bg-surface text-ink hover:bg-elev"
                    }`}
                    onClick={() => onSelect(item.id)}
                  >
                    {item.title}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs text-muted transition-colors hover:bg-elev hover:text-red-600"
                    aria-label="删除会话"
                    onClick={() => onDelete(item.id)}
                  >
                    删
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

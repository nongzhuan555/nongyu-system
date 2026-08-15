import { Button, Drawer, Grid, Input, Space } from "antd";
import { useState } from "react";
import { placeholderAssistantAdapter } from "./placeholderAdapter";
import type { AssistantPanelProps } from "./types";

export function AssistantPanel({ open, onClose, adapter }: AssistantPanelProps) {
  const screens = Grid.useBreakpoint();
  const isLg = screens.lg ?? true;
  const [draft, setDraft] = useState("");
  const chat = adapter ?? placeholderAssistantAdapter;

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    void chat.send(text);
    setDraft("");
  }

  return (
    <Drawer
      title="智慧助手"
      open={open}
      onClose={onClose}
      width={isLg ? 400 : "100%"}
      placement="right"
      destroyOnClose={false}
      zIndex={50}
      styles={{ body: { display: "flex", flexDirection: "column", padding: 16 } }}
    >
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-1 items-center justify-center rounded-2xl bg-canvas p-6 text-center">
          <p className="text-sm leading-6 text-muted">
            问数能力即将接入，可先从这里打开面板。
            <br />
            后续传入 `AssistantChatAdapter` 即可对接真实对话。
          </p>
        </div>

        <Space.Compact className="w-full">
          <Input
            className="min-h-11"
            placeholder="输入问题（暂未接入）"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onPressEnter={handleSend}
          />
          <Button className="min-h-11" type="primary" onClick={handleSend}>
            发送
          </Button>
        </Space.Compact>
      </div>
    </Drawer>
  );
}

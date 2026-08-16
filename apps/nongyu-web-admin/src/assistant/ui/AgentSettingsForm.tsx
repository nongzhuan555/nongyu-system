import { Button, Form, Input, Select } from "antd";
import { useState } from "react";
import { invalidateAdminAgent } from "../agent";
import { clearAgentConfig, loadAgentConfig, saveAgentConfig } from "../storage/agentConfig";
import { AGENT_PROVIDER_PRESETS } from "./agentProviderPresets";

export function AgentSettingsForm({ onSaved }: { onSaved: () => void }) {
  const existing = loadAgentConfig();
  const [presetId, setPresetId] = useState(AGENT_PROVIDER_PRESETS[0]?.id ?? "custom");
  const preset =
    AGENT_PROVIDER_PRESETS.find((p) => p.id === presetId) ?? AGENT_PROVIDER_PRESETS[6]!;

  return (
    <Form
      layout="vertical"
      initialValues={{
        baseURL: existing?.baseURL ?? preset.baseURL ?? "",
        apiKey: existing?.apiKey ?? "",
        model: existing?.model ?? preset.defaultModel,
      }}
      onFinish={(values: { baseURL: string; apiKey: string; model: string }) => {
        saveAgentConfig(values);
        invalidateAdminAgent();
        onSaved();
      }}
    >
      <Form.Item label="服务商">
        <Select
          value={presetId}
          options={AGENT_PROVIDER_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          onChange={(id) => {
            setPresetId(id);
          }}
        />
      </Form.Item>
      <Form.Item name="baseURL" label="Base URL" rules={[{ required: true }]}>
        <Input className="min-h-11" placeholder={preset.baseURL ?? "https://api.example.com/v1"} />
      </Form.Item>
      <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
        <Input className="min-h-11" />
      </Form.Item>
      <Form.Item name="model" label="模型" rules={[{ required: true }]}>
        <Input className="min-h-11" />
      </Form.Item>
      <div className="flex gap-2">
        <Button className="min-h-11" type="primary" htmlType="submit">
          保存
        </Button>
        <Button
          className="min-h-11"
          onClick={() => {
            clearAgentConfig();
            invalidateAdminAgent();
            onSaved();
          }}
        >
          清除自有 Key
        </Button>
      </div>
    </Form>
  );
}

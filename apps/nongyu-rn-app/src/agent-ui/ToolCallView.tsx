import { createThemedStyles } from "@/theme/createThemedStyles";
import { memo } from "react";
import { Text, View } from "react-native";
import type { ToolCallRecord } from "nongyu-agent-sdk";
import { getToolUI } from "./registry";

interface ToolCallViewProps {
  /** 工具调用记录 */
  tc: ToolCallRecord;
  /** 事件回流 */
  onAction?: (text: string) => void;
}

/**
 * 单个工具调用的内联渲染。
 *
 * 按注册表查找渲染组件；未注册则折叠为 chip，避免对话被未知工具撑乱。
 * 用 React.memo 包裹，仅在 callId/status/output 变化时重渲，
 * 不受 assistant 文本 token 流影响。
 */
function ToolCallViewInner({ tc, onAction }: ToolCallViewProps) {
  const styles = useStyles();
  const Renderer = getToolUI(tc.toolName);

  if (!Renderer) {
    // 未注册 → 折叠 chip
    return (
      <View style={styles.chip}>
        <Text style={styles.chipText}>{tc.toolName}</Text>
        {tc.status === "executing" && <Text style={styles.chipHint}>…</Text>}
      </View>
    );
  }

  const rendered = (
    <Renderer
      callId={tc.callId}
      args={tc.input}
      output={tc.output}
      status={tc.status ?? "executing"}
      error={tc.error}
      onAction={onAction}
    />
  );

  if (rendered == null) return null;

  return <View style={styles.wrap}>{rendered}</View>;
}

export const ToolCallView = memo(ToolCallViewInner);

const useStyles = createThemedStyles((t) => ({
  wrap: {
    marginVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.full,
    backgroundColor: t.color.surfaceVariant,
    marginVertical: 4,
    gap: 6,
  },
  chipText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    fontWeight: "500",
  },
  chipHint: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
}));

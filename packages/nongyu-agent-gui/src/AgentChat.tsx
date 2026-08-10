import { useMemo, useCallback } from "react";
import { useAgentChat, createAgent, OpenAIProvider, type Agent } from "nongyu-agent-sdk";
import type { AgentChatProps } from "./types";
import { ChatMessageList } from "./components/ChatMessageList";
import { ChatInput } from "./components/ChatInput";
import { EmptyState } from "./components/EmptyState";

/**
 * AgentChat — 农屿 AI 对话组件
 *
 * 通过 props.config 配置 model / tools / prompt，
 * 直接嵌入 nongyu-web-admin或nongyu官网中使用。
 *
 * @example
 * ```tsx
 * <AgentChat
 *   config={{
 *     apiKey: 'sk-xxx',
 *     baseURL: 'https://api.deepseek.com',
 *     model: 'deepseek-v4-flash',
 *     systemPrompt: '你是四川农业大学教务助手...',
 *     tools: jiaowuTools,
 *   }}
 *   welcomeMessage="我是农屿教务助手，有什么可以帮你？"
 *   suggestedQuestions={['查询课表', '查成绩', '选课']}
 * />
 * ```
 */
export function AgentChat({
  config,
  className,
  height,
  welcomeMessage,
  suggestedQuestions,
  onToolCall: onToolCallProp,
  onError,
  debug,
}: AgentChatProps) {
  // 根据 config 创建 Agent 实例（仅 config 变化时重建）
  const agent: Agent = useMemo(() => {
    const model = new OpenAIProvider({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      model: config.model,
    });

    return createAgent({
      name: "nongyu-ai-chat",
      description: "农屿 AI 对话",
      systemPrompt: config.systemPrompt,
      model,
      tools: config.tools,
      runConfig: {
        maxSteps: config.maxSteps ?? 15,
        temperature: config.temperature ?? 0.6,
      },
    });
  }, [config.apiKey, config.baseURL, config.model, config.systemPrompt, config.tools]);

  // 适配 onToolCall 签名：(toolName, input) → (info)
  const onToolCall = useCallback(
    (info: { toolName: string; input: unknown }) => {
      onToolCallProp?.(info.toolName, info.input);
    },
    [onToolCallProp],
  );

  // 使用 hook 驱动对话
  const { messages, input, handleSubmit, handleInputChange, isLoading, stop, append } =
    useAgentChat({
      agent,
      onError,
      onToolCall,
      debug,
    });

  const hasMessages = messages.length > 0;

  // 处理发送按钮点击事件
  const handleSend = useCallback(async () => {
    if (isLoading) {
      stop();
    } else {
      await handleSubmit();
    }
  }, [isLoading, stop, handleSubmit]);

  // 处理建议问题点击事件
  const handleQuestionClick = useCallback(
    (question: string) => {
      append({ role: "user", content: question });
    },
    [append],
  );

  return (
    <div
      className={`flex flex-col bg-slate-50 ${className ?? ""}`}
      style={{ height: height ?? "100%" }}
    >
      {/* 消息列表 / 空状态 */}
      {hasMessages ? (
        <ChatMessageList messages={messages} isLoading={isLoading} />
      ) : (
        <EmptyState
          welcomeMessage={welcomeMessage}
          suggestedQuestions={suggestedQuestions}
          onQuestionClick={handleQuestionClick}
        />
      )}

      {/* 底部输入栏 */}
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSend}
        isLoading={isLoading}
        placeholder="输入你的问题... (Enter 发送)"
      />
    </div>
  );
}

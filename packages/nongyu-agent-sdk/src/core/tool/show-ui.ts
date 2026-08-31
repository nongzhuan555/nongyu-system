/**
 * A2UI 元参数 showUI：仅注入到「声明了 render」的工具 JSON Schema，
 * 执行前剥离，不进入业务 execute / 审批入参。
 */

export const SHOW_UI_PARAM = "showUI" as const;

export const SHOW_UI_DESCRIPTION =
  "是否在对话中渲染本工具的结果 UI。面向用户的核心结果为 true 或省略；仅作后续工具前置取数时为 false。";

/** 缺省或非法值按 true，兼容旧行为 */
export function resolveShowUI(value: unknown): boolean {
  if (value === false) return false;
  return true;
}

/**
 * 从模型 arguments 取出 showUI 并剥离，得到业务 input。
 */
export function extractAndStripShowUI(input: unknown): { showUI: boolean; input: unknown } {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { showUI: true, input };
  }
  const record = input as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, SHOW_UI_PARAM)) {
    return { showUI: true, input };
  }
  const showUI = resolveShowUI(record[SHOW_UI_PARAM]);
  const { [SHOW_UI_PARAM]: _removed, ...rest } = record;
  return { showUI, input: rest };
}

/**
 * 向 LLM 用 JSON Schema 注入可选 showUI；已存在同名属性则跳过并 warn。
 */
export function injectShowUIIntoJsonSchema(
  schema: Record<string, unknown>,
  opts?: { toolName?: string },
): Record<string, unknown> {
  const existingProps = schema.properties;
  const props: Record<string, unknown> =
    existingProps && typeof existingProps === "object" && !Array.isArray(existingProps)
      ? { ...(existingProps as Record<string, unknown>) }
      : {};

  if (Object.prototype.hasOwnProperty.call(props, SHOW_UI_PARAM)) {
    console.warn(
      `[nongyu-agent-sdk] tool "${opts?.toolName ?? "?"}" schema already has "${SHOW_UI_PARAM}"; skip inject`,
    );
    return schema;
  }

  props[SHOW_UI_PARAM] = {
    type: "boolean",
    description: SHOW_UI_DESCRIPTION,
  };

  return {
    ...schema,
    type: schema.type ?? "object",
    properties: props,
  };
}

/** 前端是否应渲染该次工具调用 UI（历史无字段视为显示） */
export function shouldShowToolUI(tc: { showUI?: boolean }): boolean {
  return tc.showUI !== false;
}

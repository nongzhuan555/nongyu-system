import type { Tool } from '../../types/tool';

/**
 * 工具注册表
 *
 * 管理 Agent 可用的工具集合，支持按名称查找和 JSON Schema 批量导出。
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /** 注册工具 */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`工具 "${tool.name}" 已存在，请使用不同的名称`);
    }
    this.tools.set(tool.name, tool);
  }

  /** 获取工具 */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /** 检查工具是否存在 */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** 获取所有工具名称 */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /** 删除工具 */
  remove(name: string): boolean {
    return this.tools.delete(name);
  }

  /** 获取所有工具的 JSON Schema 列表（供 LLM 使用） */
  getToolSchemas(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.toJSONSchema(),
      },
    }));
  }

  /** 获取所有工具 */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }
}

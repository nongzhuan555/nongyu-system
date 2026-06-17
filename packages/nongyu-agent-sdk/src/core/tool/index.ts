import type { z } from 'zod';
import type { Tool, ToolContext, ToolDefinition } from '../../types/tool';
import { zodToJsonSchema } from './json-schema';

/**
 * Tool 内部实现类
 */
class ToolImpl<TInput extends z.ZodTypeAny, TOutput> implements Tool<TInput, TOutput> {
  public readonly name: string;
  public readonly description: string;
  public readonly inputSchema: TInput;
  private readonly _execute: (input: z.infer<TInput>, context: ToolContext) => Promise<TOutput>;
  private readonly _needsApproval: (input: z.infer<TInput>) => boolean;

  constructor(def: ToolDefinition<TInput, TOutput>) {
    this.name = def.name;
    this.description = def.description;
    this.inputSchema = def.inputSchema;
    this._execute = def.execute.bind(def);

    // 处理工具审批
    if (def.needsApproval === undefined) {
      this._needsApproval = () => false; // 默认不需要审批
    } else if (typeof def.needsApproval === 'boolean') {
      this._needsApproval = () => def.needsApproval as boolean;
    } else {
      this._needsApproval = def.needsApproval;
    }
  }

  toJSONSchema(): Record<string, unknown> {
    return zodToJsonSchema(this.inputSchema);
  }

  async execute(input: z.infer<TInput>, context: ToolContext): Promise<TOutput> {
    const parsed = this.inputSchema.parse(input) as z.infer<TInput>;
    return this._execute(parsed, context);
  }

  needsApproval(input: z.infer<TInput>): boolean {
    return this._needsApproval(input);
  }
}

/**
 * 工具工厂函数
 *
 * 创建一个带有 Zod Schema 校验的类型安全工具。
 *
 * @example
 * const courseQueryTool = tool({
 *   name: 'course_query',
 *   description: '查询课程信息',
 *   inputSchema: z.object({ keyword: z.string().describe('搜索关键词') }),
 *   async execute({ keyword }, ctx) {
 *     return await queryCourses(keyword);
 *   },
 * });
 */
export function tool<TInput extends z.ZodTypeAny, TOutput = unknown>(
  def: ToolDefinition<TInput, TOutput>,
): Tool<TInput, TOutput> {
  return new ToolImpl(def);
}

export { zodToJsonSchema } from './json-schema';
export { ToolRegistry } from './registry';

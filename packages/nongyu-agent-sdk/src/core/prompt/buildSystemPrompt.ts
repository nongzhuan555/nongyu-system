/**
 * 系统提示词构建器
 *
 * 将用户定义的 Agent 角色描述包装为结构化的系统提示词，
 * 包含身份定义、工作原则、输出格式等通用约束。
 */

// 系统提示词组件
export interface SystemPromptComponent {
    /** Agent 角色描述/核心系统提示词 */
    roleDefinition: string;
    /** 可以执行的任务 */
    canExecute: string;
    /** 不可以执行的任务 */
    cannotExecute: string;
    /** 核心工作原则 */
    principles: string;
    /** 标准工作流程 */
    workflow: string;
    /** 输出格式要求 */
    outputFormat?: string;
    /** 示例 */
    few_shots?: string;
    /** 可用的工具 */
    tools?: string;
}

// ===== 构建函数 =====

export function buildSystemPrompt({ roleDefinition, canExecute, cannotExecute, principles, workflow, outputFormat, few_shots, tools }: SystemPromptComponent): string {
    // 系统提示词模板
    const SYSTEM_PROMPT_TEMPLATE = `
        # 系统提示词
        ## 角色定义
        ${roleDefinition}
        ## 能力边界
        ### 可以执行的任务
        ${canExecute}
        ### 不可以执行的任务
        ${cannotExecute}
        ## 核心工作原则
        ${principles}
        ## 标准工作流程
        ${workflow}
        ## 输出格式要求
        ${outputFormat}
        ## 示例
        ${few_shots}
        ## 可用的工具
        ${tools}
    `
    return SYSTEM_PROMPT_TEMPLATE;
}

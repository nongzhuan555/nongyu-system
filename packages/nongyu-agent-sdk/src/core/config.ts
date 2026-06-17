/**
 * SDK 运行时配置 (in-memory)
 *
 * 本 SDK 主要运行在 Web 环境中，API Key 和 BaseURL 仅保存在内存中，
 * 不持久化到 localStorage / cookie。用户通过 configure() 设置配置，
 * 后续组件通过 resolveApiConfig() 获取。
 *
 * 如果未配置 key 和 url，后续操作将抛出错误（后续可扩展为后端转发）。
 */

import { OpenAIProvider } from './model/openai';
import type { ModelProvider } from '../types/model';

export interface SDKConfig {
  /** API 密钥 */
  apiKey: string;
  /** API 基础 URL（OpenAI 兼容） */
  baseURL: string;
  /** 默认模型名称 */
  model: string;
}

const MISSING_CONFIG_ERROR =
  '请先调用 configure({ apiKey, baseURL, model }) 配置 SDK。';

let _config: SDKConfig | null = null;

/**
 * 配置 SDK 运行时参数
 *
 * @example
 * configure({
 *   apiKey: 'sk-xxx',
 *   baseURL: 'https://api.openai.com/v1',
 *   model: 'gpt-4o-mini',
 * });
 */
export function configure(config: SDKConfig): void {
  _config = { ...config };
}

/**
 * 获取当前配置，未配置时抛出错误
 */
export function resolveApiConfig(): SDKConfig {
  if (!_config || !_config.apiKey || !_config.baseURL) {
    throw new Error(MISSING_CONFIG_ERROR);
  }
  return _config;
}

/**
 * 检查是否已配置
 */
export function isConfigured(): boolean {
  return !!(_config && _config.apiKey && _config.baseURL);
}

/**
 * 重置配置（仅用于测试）
 */
export function resetConfig(): void {
  _config = null;
}

/**
 * 基于全局配置创建一个 OpenAI 兼容的 ModelProvider
 *
 * 便捷方法，等价于：
 *   const config = resolveApiConfig();
 *   new OpenAIProvider(config);
 */
export function createOpenAI(): ModelProvider {
  const config = resolveApiConfig();
  return new OpenAIProvider(config);
}

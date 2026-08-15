/**
 * Node-only 子入口：StdioChannel
 *
 * 依赖 node:readline，不可被 React Native / Metro 主包引用。
 * 用法：`import { StdioChannel } from "nongyu-agent-sdk/stdio"`
 */

export { StdioChannel } from "./core/channel/builtin/stdio";
export type { StdioChannelOptions } from "./core/channel/builtin/stdio";

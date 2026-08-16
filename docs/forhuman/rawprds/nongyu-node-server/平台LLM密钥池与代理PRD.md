# 平台 LLM 密钥池与代理 PRD（草稿）

> 来源：与 Coding Agent 对齐的 Grill 共识（基建需求）  
> 涉及：`nongyu-node-server` / `nongyu-web-admin` / `nongyu-rn-app`

## 背景

RN 端 Agent 目前要求用户自配大模型 API Key。希望后台维护一批智谱免费 Key（计划 `glm-4.6-flash`，3 账号 × 3 Key），用户未配置自有 Key 时由后端转发 LLM 调用；免费 Key 易排队/限流，需要调度轮换，尽量对用户无感。管理端可对参与调度的 Key 做增删改查。

## 目标

1. 用户无自有 Key 且已登录农屿时，自动走平台代理 + Key 池调度。
2. 有自有 Key 时仍直连厂商，行为不变。
3. 调度按账号组共享并发、租约、冷却、短排队、失败换 Key，避免单 Key 长时间卡住。
4. 管理端可管理 Key 池（增删改查、启停），明文不下发到客户端。

## 共识摘要

- 基建需求；MVP：代理 + 调度 + 管理端 CRUD + RN 回退接缝。
- 账号级并发预算（同 accountGroup 默认并发 1）；按高峰同时对话 ≤3～5 设计。
- 池满短排队 ≤15s，超时友好失败。
- 须 App JWT；每用户平台槽并发 1 + 日调用上限默认 100。
- 单实例进程内调度；Key 加密存储、列表脱敏；禁用 + 硬删。
- 全局默认 model 可配置，默认 `glm-4.7-flash`；Key 可单独覆盖 `model`/`baseUrl`；启用 Key 全部入池可调度；忽略客户端 model。
- 本修订仅 Node；不改 App。

## 非目标（MVP）

- 多厂商池、完整监控大盘、多 Node 实例 Redis 调度、匿名蹭池。

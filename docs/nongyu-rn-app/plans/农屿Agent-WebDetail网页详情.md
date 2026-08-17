# 实施计划：农屿 Agent WebDetail（网页详情抓取）

| 项       | 内容                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| Spec     | `docs/nongyu-rn-app/specs/农屿Agent-WebDetail网页详情.md`                     |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/Shell/农屿Agent-WebDetail网页详情PRD.md` |
| 技术方案 | 本期跳过                                                                      |
| 状态     | **已落地（待人工回归）**                                                      |

---

## 实施步骤

1. **SDK：改造 `WebFetchTool.ts` → `web_detail`**
   - 工具 `name` 改为 `web_detail`；导出符号改为 `webDetailTool`（可保留文件名或重命名为 `WebDetailTool.ts`，并更新 `BuiltinTools/index.ts`）。
   - 保留：fetch + iconv 编码识别；**新增** HTML meta charset 兜底。
   - 新增：title 抽取、去 script/style 后剥标签得 `text`、长度截断（约 30k）与 `truncated`。
   - 新增：401/403、过短正文、登录墙关键词 → `{ ok:false, reason:"no_permission", message:"无此权限查看该页面内容" }`。
   - 成功 → `{ ok:true, url, encoding, title?, text, truncated }`。
   - 网络/其它 HTTP 错误 → `ok:false` + `reason:"fetch_error"`（或抛错，与 Spec 一致任选其一；优先结构化返回便于模型转述）。

2. **SDK：主入口导出**
   - `packages/nongyu-agent-sdk/src/index.ts` 导出 `webDetailTool`；移除/不再导出旧 `webFetchTool`（若曾导出）。

3. **RN：注册工具**
   - `agent.ts`：自有 Key 时 `tools` 增加 `web_detail: webDetailTool`（与 `web_search` 同分支）。
   - `NONGYU_AGENT_SYSTEM_PROMPT_WEB_SEARCH`（或并列段）补充：`web_detail` 查看网页详情；无权限如实告知；校内工具优先。

4. **文档收尾**
   - Spec 状态改为「已确认，实施中/已落地」；本计划状态同步。
   - 仓库内检索是否仍有 `web_fetch` / `webFetchTool` 引用并清掉。

5. **自检**
   - 相关包 type-check；人工：公开页 / 登录墙 / 平台代理无工具。

---

## 风险与注意

| 风险                            | 缓解                                             |
| ------------------------------- | ------------------------------------------------ |
| CSR 空壳页被误判无权限          | Spec 已接受；统一「无权限」文案，不编造          |
| 剥标签误伤正文                  | 先去 script/style 再剥标签；失败时仍可截断文本   |
| RN 环境 `Buffer` / `iconv-lite` | 现有 `WebFetchTool` 已依赖，保持同一路径即可     |
| Prompt 过长                     | 与现有 WebSearch 段合并一句，避免再复制整段 BASE |

---

## 预估改动文件

- `packages/nongyu-agent-sdk/src/core/tool/BuiltinTools/WebFetchTool.ts`（或重命名）
- `packages/nongyu-agent-sdk/src/core/tool/BuiltinTools/index.ts`
- `packages/nongyu-agent-sdk/src/index.ts`
- `apps/nongyu-rn-app/src/agent/agent.ts`
- `docs/nongyu-rn-app/specs/农屿Agent-WebDetail网页详情.md`（状态）
- 本计划状态

---

## 修订记录

| 日期       | 说明               |
| ---------- | ------------------ |
| 2026-08-17 | 初版，待确认后编码 |
| 2026-08-17 | 确认并完成编码     |

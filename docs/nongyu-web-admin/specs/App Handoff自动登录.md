# Spec：App Handoff 自动登录

| 项       | 内容                                                               |
| -------- | ------------------------------------------------------------------ |
| 应用     | `apps/nongyu-web-admin`                                            |
| 需求类型 | **基建**                                                           |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/MyPage/App打开管理后台PRD.md` |
| 后端契约 | `docs/nongyu-node-server/specs/App打开管理后台Handoff.md`          |
| 前置     | `登录与管理端壳.md`                                                |
| 状态     | **已实现**                                                         |
| 日期     | 2026-08-16                                                         |

---

## 1. 背景

登录壳已预留 `loginType=in_app` 与 `__NONGYU_ADMIN_PREFILL__`（只预填、不自动提交）。本切片接上 App handoff：**URL 带 `ticket` 时自动兑换 Admin 会话并进入工作台**，满足「从 App 点进即登录」。

---

## 2. 目标

1. 访问登录页（或带 ticket 的入口 URL）时，若 `loginType=in_app` 且存在非空 `ticket`，自动调用 redeem，成功后写入会话并 `replace` 进入工作台（或原 `from` 安全路径）。
2. 兑换中展示明确加载态；失败展示可理解错误，并回落为普通登录表单（可继续手输密码）。
3. 兑换成功后从地址栏去掉 `ticket`（避免分享/历史残留）。
4. 不把 ticket 写入 `localStorage`；不记录明文 ticket 到分析日志。

---

## 3. 边界（非目标）

| 非目标                                   | 说明                                 |
| ---------------------------------------- | ------------------------------------ |
| 依赖 `__NONGYU_ADMIN_PREFILL__` 自动登录 | 本刀以 ticket 为准；预填口可保留不动 |
| 改密码登录文案 / 布局大改                | 沿用现登录页                         |
| 实现 Node handoff                        | 见 Node Spec                         |
| 无 ticket 时自动登录                     | 禁止                                 |

---

## 4. 详细需求

### 4.1 触发条件

在 **登录页**（`ROUTES.login`）挂载时解析 `location.search`：

| 参数        | 规则                                                |
| ----------- | --------------------------------------------------- |
| `loginType` | 仍按现逻辑：`=== "in_app"` → `in_app`，否则 browser |
| `ticket`    | 非空字符串则进入自动 redeem 流程                    |

仅当 **同时** 满足：`loginType === "in_app"` **且** `ticket` 非空时自动登录。  
仅有 ticket、无 `in_app`：不自动登录（防误用）；可提示或忽略 ticket。  
仅有 `in_app`、无 ticket：行为与现网一致（展示表单；若有 prefill 只填不提交）。

### 4.2 自动登录流程

1. 进入 loading：文案「正在从 App 进入管理台…」；表单禁用或隐藏。
2. `POST /api/admin/auth/handoff-redeem`，Body `{ ticket }`。
3. 成功：按现 `authStore` 登录成功路径存 session；`navigate(safeInternalPath(from), { replace: true })`；并用 `replace` 清掉 query 中的 `ticket`（保留其它无害参数可选，**必须去掉 ticket**）。
4. 失败：结束 loading；`Alert` 展示错误（映射见下）；展示常规登录表单。

**错误文案**

| 后端情况              | 界面文案                          |
| --------------------- | --------------------------------- |
| Ticket 无效/过期/已用 | 登录链接已失效，请从 App 重新打开 |
| 网络失败              | 网络异常，请稍后重试              |
| 其它                  | 自动登录失败，请手动登录          |

### 4.3 与已有会话

- 若本地已有有效 Admin 会话且用户打开带 ticket 的登录 URL：优先尝试 redeem；成功则刷新会话并进工作台。若 redeem 失败，可保留原会话并重定向工作台，或清会话后显示表单——**推荐**：redeem 失败时若原会话仍有效则 `replace` 进工作台并去掉 ticket；若无会话则显示表单+错误。
- 已登录用户访问无 ticket 的 `/login`：仍按现 Spec 重定向工作台。

### 4.4 API 封装

- 在 `adminApi`（或等价）增加 `redeemAdminHandoff(ticket: string)`。
- `loginType` 类型保持 `"browser" | "in_app"`；redeem 成功后的 `loginType` 以响应为准（契约为 `in_app`）。

### 4.5 修订既有 Spec 说明

`登录与管理端壳.md` 中「本刀不自动提交」对 **ticket handoff** 不再适用；密码预填口仍不自动提交。实现时可在该文档修订记录中加一句交叉引用，不必全文重写。

---

## 5. 业务流程

```
打开 /login?loginType=in_app&ticket=…
  → handoff-redeem
  → 存 Admin session
  → replace /workspace（并去掉 ticket）
失败 → 提示 + 手动登录表单
```

---

## 6. 验收标准

**UI / 操作**

- [ ] App 打开带 ticket 的链接：短暂「正在从 App 进入管理台…」后进入工作台，无需点登录。
- [ ] 地址栏最终无 `ticket`。
- [ ] ticket 过期：提示「登录链接已失效…」，可手输学号密码登录。
- [ ] 普通 `/login`（无 ticket）：行为与现网一致。
- [ ] `loginType=in_app` 无 ticket：不自动登录。

**安全**

- [ ] ticket 不进 `localStorage`。
- [ ] 同一 ticket 二次打开失败并提示失效。

---

## 7. 修订记录

| 日期       | 说明                 |
| ---------- | -------------------- |
| 2026-08-16 | 初版 ticket 自动登录 |

# Spec：App Handoff 自动登录

| 项       | 内容                                                               |
| -------- | ------------------------------------------------------------------ |
| 应用     | `apps/nongyu-web-admin`                                            |
| 需求类型 | **基建**                                                           |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/MyPage/App打开管理后台PRD.md` |
| 后端契约 | `docs/nongyu-node-server/specs/App打开管理后台Handoff.md`          |
| RN Spec  | `docs/nongyu-rn-app/specs/App打开管理后台Handoff安全.md`           |
| 前置     | `登录与管理端壳.md`                                                |
| 状态     | **已实现（2026-08-17 安全修订）**                                  |
| 日期     | 2026-08-16                                                         |

---

## 1. 背景

登录壳已预留 `loginType=in_app` 与 `__NONGYU_ADMIN_PREFILL__`（只预填、不自动提交）。Handoff 自动登录满足「从 App 点进即登录」。

**2026-08-17**：禁止依赖 URL query 中的 `ticket`（可被外置浏览器分享盗用）。改为仅接受 App WebView 注入的 `window.__NONGYU_ADMIN_HANDOFF_TICKET__`。

---

## 2. 目标

1. 登录页在 `loginType=in_app` 且存在 **注入 ticket** 时，自动 redeem，成功后写入会话并 `replace` 进入工作台（或原 `from` 安全路径）。
2. 兑换中展示明确加载态；失败展示可理解错误，并回落为普通登录表单。
3. **不**从 URL query 读取或兑换 `ticket`；若 URL 带 `ticket`，应忽略并尽快从地址栏去掉（防残留），**不**据此自动登录。
4. 不把 ticket 写入 `localStorage`；不记录明文 ticket 到分析日志。
5. 注入 ticket 读取后立即从 `window` 删除，避免同页重复使用。

---

## 3. 边界（非目标）

| 非目标                                   | 说明                       |
| ---------------------------------------- | -------------------------- |
| 依赖 `__NONGYU_ADMIN_PREFILL__` 自动登录 | 预填口仍只填不提交         |
| 改密码登录文案 / 布局大改                | 沿用现登录页               |
| 实现 Node handoff                        | 见 Node Spec               |
| 无注入 ticket 时自动登录                 | 禁止（含仅有 URL ticket）  |
| 外置浏览器免密                           | 明确不做；外置只能手输密码 |

---

## 4. 详细需求

### 4.1 触发条件

在 **登录页**（`ROUTES.login`）挂载时：

| 来源                                     | 规则                                                |
| ---------------------------------------- | --------------------------------------------------- |
| `loginType`（`location.search`）         | `=== "in_app"` → `in_app`，否则 browser             |
| `window.__NONGYU_ADMIN_HANDOFF_TICKET__` | 非空字符串 → 作为 redeem 用 ticket；读后删除        |
| URL `ticket` query                       | **忽略**，不得自动登录；可用 `replace` 从地址栏去掉 |

仅当 **同时** 满足：`loginType === "in_app"` **且** 注入 ticket 非空时自动登录。  
仅有 `in_app`、无注入 ticket：展示表单（与现网一致）。

### 4.2 自动登录流程

1. 进入 loading：文案「正在从 App 进入管理台…」；表单禁用或隐藏。
2. `POST /api/admin/auth/handoff-redeem`，Body `{ ticket }`（注入值）。
3. 成功：按现 `authStore` 登录成功路径存 session；`navigate(safeInternalPath(from), { replace: true })`；地址栏不得残留 `ticket` query。
4. 失败：结束 loading；展示错误（映射见下）；展示常规登录表单。

**错误文案**

| 后端情况              | 界面文案                          |
| --------------------- | --------------------------------- |
| Ticket 无效/过期/已用 | 登录链接已失效，请从 App 重新打开 |
| 网络失败              | 网络异常，请稍后重试              |
| 其它                  | 自动登录失败，请手动登录          |

### 4.3 与已有会话

- 若本地已有有效 Admin 会话且本次有注入 ticket：优先尝试 redeem；失败则若原会话仍有效则 `replace` 进工作台；若无会话则显示表单+错误。
- 已登录用户访问无注入意图的 `/login`：仍按现 Spec 重定向工作台。
- `GuestOnly`：`loginType=in_app` 时允许进入登录页以完成注入兑换（不要求 URL 带 ticket）。

### 4.4 API 封装

- `redeemAdminHandoff(ticket: string)` 保持不变。
- `loginType` 类型保持 `"browser" | "in_app"`。

### 4.5 修订既有 Spec 说明

`登录与管理端壳.md` 中「本刀不自动提交」对 **注入 ticket handoff** 不适用；密码预填口仍不自动提交。

---

## 5. 业务流程

```
App WebView 打开 /login?loginType=in_app
  →（文档前）注入 __NONGYU_ADMIN_HANDOFF_TICKET__
  → LoginPage 读取并 delete window 字段
  → handoff-redeem
  → 存 Admin session
  → replace /workspace
失败 → 提示 + 手动登录表单

外置浏览器打开任意带/不带 ticket 的 URL
  → 不自动免登（忽略 URL ticket）
```

---

## 6. 验收标准

**UI / 操作**

- [ ] App 内置 WebView 注入 ticket：短暂「正在从 App 进入管理台…」后进入工作台。
- [ ] 地址栏无 `ticket`（打开时即无；若旧链接带 ticket 则被去掉且不兑换）。
- [ ] 注入 ticket 无效/过期：提示「登录链接已失效…」，可手输登录。
- [ ] 普通 `/login`：行为与现网一致。
- [ ] `loginType=in_app` 无注入：不自动登录。
- [ ] 外置浏览器打开含 `ticket` 的旧链接：不自动登录。

**安全**

- [ ] ticket 不进 `localStorage`。
- [ ] 同一 ticket 二次兑换失败。
- [ ] URL query `ticket` 不能完成免登。

---

## 7. 修订记录

| 日期       | 说明                                      |
| ---------- | ----------------------------------------- |
| 2026-08-16 | 初版 ticket 自动登录（URL query）         |
| 2026-08-17 | 改为仅 WebView 注入；忽略 URL ticket 免登 |

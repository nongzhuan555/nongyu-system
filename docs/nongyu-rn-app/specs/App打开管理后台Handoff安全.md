# Spec：App 打开管理后台 Handoff 安全加固

| 项       | 内容                                                               |
| -------- | ------------------------------------------------------------------ |
| 应用     | `apps/nongyu-rn-app`                                               |
| 需求类型 | **基建**                                                           |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/MyPage/App打开管理后台PRD.md` |
| 关联     | Web `App Handoff自动登录.md`；Node `App打开管理后台Handoff.md`     |
| 状态     | **已实现**                                                         |
| 日期     | 2026-08-17                                                         |

---

## 1. 背景

既有 handoff 将短时 `ticket` 放在管理端登录 URL query 中。外置浏览器可打开该链接，存在「链接被转发/抄走即可在 TTL 内免密进管理台」的风险。同时应用内 WebView 在免登跳转后出现白屏，外置浏览器正常。

---

## 2. 目标

1. **Ticket 永不出现在可分享的 URL**（含管理端地址栏、系统浏览器地址、WebView 的 `source.uri`）。
2. 管理台入口 **强制应用内 WebView** 打开，不受「网页跳转」偏好影响；ticket 仅经 WebView 注入交给页面。
3. 修复应用内 WebView 白屏：首屏加载遮罩不得在 SPA 二次导航后永久盖死；加载失败有可见提示。

---

## 3. 边界（非目标）

| 非目标                           | 说明                                |
| -------------------------------- | ----------------------------------- |
| 改 Node handoff API 契约         | 仍 `app-handoff` / `handoff-redeem` |
| PKCE / IP 绑定                   | 本刀不做                            |
| 普通外链（关于农屿等）改打开方式 | 仍走 `openAppUrl` 全局偏好          |

---

## 4. 详细需求

### 4.1 打开流程

1. `POST /api/admin/auth/app-handoff` 取得 `ticket`（仅存 App 内存短时槽，**不**写入 MMKV / 路由参数 / 打开 URL）。
2. 打开 URL：`{ADMIN_WEB_BASE}/login?loginType=in_app`（**无** `ticket` query）。
3. **强制** `forceInApp` 进入 `/web-viewer`；忽略「系统浏览器」偏好。
4. WebView 在文档加载前注入：`window.__NONGYU_ADMIN_HANDOFF_TICKET__ = "<ticket>"`，随后清空 App 侧短时槽。

### 4.2 WebView

- 仅首次文档加载显示遮罩；`onLoadStart` 再次触发时不得重新盖死白底直到用户无反馈。
- `onError` / HTTP 错误：遮罩结束并展示简短错误文案。
- 开启 `domStorageEnabled`，保证管理端 `localStorage` 会话可用。

### 4.3 失败

- handoff 接口失败：既有 Toast，不打开 WebView。
- 打开 WebView 失败：Toast「打开失败」。

---

## 5. 业务流程

```
管理员点「农屿管理台」
  → app-handoff → ticket（内存）
  → 强制 WebView 打开 /admin/login?loginType=in_app
  → inject __NONGYU_ADMIN_HANDOFF_TICKET__
  → Web 自动 redeem → 工作台
```

---

## 6. 验收标准

- [ ] 管理台打开 URL 的 query **不含** `ticket`。
- [ ] 系统浏览器偏好开启时，管理台仍走应用内 WebView。
- [ ] 免登成功后可见工作台（不再白屏卡死）。
- [ ] 复制地址栏链接在外部打开：不能自动免登（仅登录表单）。

---

## 7. 修订记录

| 日期       | 说明                     |
| ---------- | ------------------------ |
| 2026-08-17 | 初版：注入 ticket + 白屏 |

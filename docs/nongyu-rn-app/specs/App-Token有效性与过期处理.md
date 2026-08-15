# Spec：App Token 有效性与过期处理

| 项       | 内容                                                      |
| -------- | --------------------------------------------------------- |
| 应用     | `apps/nongyu-rn-app`                                      |
| 需求类型 | **基建**                                                  |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/User/登录登出PRD.md` |
| 后端契约 | `docs/nongyu-node-server/specs/App与Admin鉴权会话策略.md` |
| 状态     | **已实现**                                                |
| 日期     | 2026-08-15                                                |

---

## 1. 背景

Node 将区分 `TOKEN_EXPIRED`（40103）与 `TOKEN_REVOKED`（40104）。客户端需在冷启动主动验票，并在业务请求收到上述码时按「退出登录」清理本地态，避免继续使用废票或陈旧 DEV Token。

---

## 2. 目标

1. 冷启动 hydrate 后若存在 Node `session.token`，调用 `GET /api/app/auth/me` 校验。
2. 识别 `40103` / `40104`（及等价文案兜底），执行与主动登出一致的本地清理（教务凭据、Cookie、MMKV 会话、session store 等——**与现 `performJiaowuLogout` 本地侧一致**；是否调用 Node logout：过期票可跳过，作废票 best-effort 调用或不调用，实现选 **跳过 Node logout** 以免无意义 401）。
3. Toast 提示后停留在登录页（门禁已有）。
4. `__DEV__` 下 `EXPO_PUBLIC_DEV_APP_TOKEN`：**仅当 `session.token` 为空且显式需要联调时可用**；一旦本机曾写入过真实登录 Token 的会话策略改为——**有 session 内存/快照意图用真票时禁止回落**；推荐默认：**仅当 `session.token == null` 且设置了 env 时回落**，但文档要求开发者及时更新 mock；本刀增加：若 `/me` 或业务接口返回 40103/40104，**清除 session.token 后不得立刻再用同一 DEV Token 重试死循环**（同一冷启动周期内对 DEV Token 失败则停止回落）。

简化落地（验收口径）：

- `getAppAccessToken`：优先 `session.token`；仅当其为 `null` 时才读 DEV Token。
- 验票失败（40103/40104）→ 清本地登录态；**不**在清完后自动改用 DEV Token 再请求。

---

## 3. 边界

| 非目标                        | 说明                      |
| ----------------------------- | ------------------------- |
| Refresh / 静默续期            | 不做                      |
| 修改教务登录主流程顺序        | 不改                      |
| 本地解析 JWT `exp` 替代服务端 | 以 `/me` 与接口错误码为准 |
| Admin / WebView               | 不在本 Spec               |

---

## 4. 详细需求

### 4.1 冷启动验票

在 `useJiaowuBootstrap`（或紧随其后的等价钩子）中：

1. 恢复本地教务会话与 `snapshot.token` 如现网。
2. 若 `token` 非空：请求 `GET /api/app/auth/me`（带 Bearer）。
3. 成功：保持会话。
4. 失败且业务码为 `40103`：清本地登录态；Toast：**「登录已过期，请重新登录」**。
5. 失败且业务码为 `40104`：清本地登录态；Toast：**「登录状态已失效，请重新登录」**（若响应能区分顶号可再用「账号已在其他设备登录」，本期后端可统一 40104 文案，前端先用通用句）。
6. 网络错误 / 5xx：**不清登录态**（避免无网误踢）；保持本地会话，业务请求按现网错误处理。
7. `40102` 或其它 401：按作废处理（同 40104），避免废票残留。

`hydrated=true` 须在验票流程结束（含跳过无 token）后设置，避免闪入主界面再被踢。

### 4.2 运行中请求

`appFetch` / `parseApiResponse`：当 HTTP 401 且 `code ∈ {40103,40104,40102}`：

- 触发统一 `handleAuthInvalid({ code })`：清本地 + 对应 Toast（过期用 4.1 文案；其余用失效文案）。
- 门禁因 `isAuthenticated===false` 回到登录页。
- 避免并发多请求弹出多个 Toast（短时去重）。

### 4.3 Toast

使用项目全局 Toast；文案见上；不阻塞为 Modal。

---

## 5. 流程

```text
冷启动
  → 读凭据 + snapshot
  → 无 token：hydrated，按门禁（可有教务无 Node 票，与现网「不强制 Node Token」一致则仍可进 App；
       若产品要求无 Node 票也验——本期：无 token 不调 /me，不 Toast）
  → 有 token：/me
       · OK → 进 App
       · 40103/40104/40102 → 清本地 → Toast → 登录页
       · 网络失败 → 保留本地 → 进 App
```

说明：与现网「教务会话即可 `isAuthenticated`」对齐时，**仅清除 Node token 还是整段登出**？

**本期决定（与用户「按常规退出登录处理」对齐）：40103/40104/40102 时执行完整本地登出（含教务凭据），回到登录页。**

---

## 6. 验收

- [ ] 持有效 Token 冷启动：无 Toast，正常进首页；`/me` 成功。
- [ ] 持过期 Token（或后端返回 40103）：清本地，Toast「登录已过期，请重新登录」，停在登录页。
- [ ] 登出/换设备后旧 Token（40104）：清本地，Toast 失效文案，登录页。
- [ ] 杀进程前有效、启动时无网：不清登录态，不误 Toast 过期。
- [ ] 广场等请求中途 40103：同样清本地 + Toast，不刷屏。
- [ ] `session.token` 被清空后，不会自动用已失败的 DEV Token 紧接着重试打爆接口。

---

## 7. 修订记录

| 日期       | 说明                                             |
| ---------- | ------------------------------------------------ |
| 2026-08-15 | 初版：冷启动 /me、过期与作废分文案、完整本地登出 |

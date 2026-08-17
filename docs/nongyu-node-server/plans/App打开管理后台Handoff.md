# 实施计划：App 打开管理后台 Handoff

| 项       | 内容                                                                                     |
| -------- | ---------------------------------------------------------------------------------------- |
| Spec     | Node `App打开管理后台Handoff.md`；RN `我的页管理台入口.md`；Web `App Handoff自动登录.md` |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/MyPage/App打开管理后台PRD.md`                       |
| 技术文档 | **不写**（契约已在 Spec）                                                                |
| 状态     | **已完成**                                                                               |
| 日期     | 2026-08-16                                                                               |

---

## 1. 实施计划

一人交付；顺序 **Node → Web → RN**（先契约可测，再自动登录，最后入口联调）。

| 步骤 | 内容                                                            | 风险 / 缓解                  |
| ---- | --------------------------------------------------------------- | ---------------------------- |
| 1    | Node：内存 ticket 仓 + `app-handoff` / `handoff-redeem` + 测试  | 单实例内存；多实例后再 Redis |
| 2    | 更新 `接口文档概览.md`；三份 Spec 状态改「实现中/已实现」       | 文档与代码同步               |
| 3    | Web：`redeemAdminHandoff` + LoginPage 自动兑换 + 清 ticket      | 失败回落手输登录             |
| 4    | RN：会话持久化 `role`；更多服务条件入口；handoff + `openAppUrl` | 登出清 role                  |
| 5    | 本地联调 / lint·type-check·format                               | 按开发规范                   |

**改动面**：`nongyu-node-server`、`nongyu-web-admin`、`nongyu-rn-app` 及对应 docs。

**不做**：本地管理员密码、设置页改密、bootstrap handoff、强制 WebView。

---

## 2. 实施步骤

### 2.1 Node

1. `src/modules/auth/handoffStore.ts`：Map + TTL 60s；`create` / `consume`（consume 即单次）。
2. `service.ts`：`createAppHandoff(appUser)`、`redeemHandoff(ticket)` → 复用现有 Admin JWT 签发与用户投影。
3. `routes.ts`：
   - `POST /app-handoff`：`requireAppAuth` + `loginRateLimit`
   - `POST /handoff-redeem`：`loginRateLimit`，无 Bearer
4. 集成测：helpers 里管理员用户 + App 登录后 handoff / redeem / 二次失效。
5. 接口概览补两节。

### 2.2 Web Admin

1. `adminApi.ts`：`redeemAdminHandoff(ticket)`。
2. `authStore`：增加 `loginWithHandoff` 或复用 session 写入。
3. `LoginPage`：解析 `loginType`+`ticket` → 自动 redeem → 成功进工作台并 `replace` 去掉 ticket；失败 Alert + 表单。
4. 修订 `登录与管理端壳.md` 修订记录一句交叉引用。

### 2.3 RN App

1. `session`：增加 `role: 0 | 1 | null`；`setSession` / hydrate / logout 贯通；从 login/`me` 的 `user.role` 写入。
2. 持久化：与现有 token/profile 同路径（查 bootstrap / mmkv），保证冷启动管理员仍见入口。
3. `services.ts` + `ServiceList` / `MineScreen`：管理员追加「农屿管理台」。
4. 点击：`app-handoff` → `https://nongyu.site/admin/login?loginType=in_app&ticket=…` → `openAppUrl`；错误 Toast 按 Spec。

### 2.4 收尾

- Spec 状态 → 已实现；本计划状态 → 已完成。
- `pnpm lint` / `type-check` / `format`（触及包）。

---

## 3. 注意事项

- Ticket 勿打全量日志；勿进 `localStorage`。
- URL 必须带 `loginType=in_app` 且非空 `ticket` 才自动登录。
- Handoff 仅已建档 `role=1`；与密码登录并存。

---

## 4. 验收（对照 Spec）

- [ ] Node 测例通过（签发 / 兑换 / 二次 / 非管理员）。
- [ ] Web：带 ticket 自动进工作台；过期可手输登录；地址栏无 ticket。
- [ ] RN：仅管理员见入口；点开无弹窗；内置/系统浏览器均可（ticket 在 URL）。

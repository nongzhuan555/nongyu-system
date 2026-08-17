# Spec：App 打开管理后台 Handoff

| 项       | 内容                                                               |
| -------- | ------------------------------------------------------------------ |
| 应用     | `apps/nongyu-node-server`                                          |
| 需求类型 | **基建**                                                           |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/MyPage/App打开管理后台PRD.md` |
| 关联     | `App与Admin鉴权会话策略.md`；RN / Web Admin 同名能力 Spec          |
| 状态     | **已实现**                                                         |
| 日期     | 2026-08-16                                                         |

---

## 1. 背景

管理员从农屿 App 进入 Web 管理台时，不应再输入农屿管理员密码。库内仅有 `admin_password_hash`，无法下发明文。本切片提供 **App JWT → 短时单次 ticket → Admin JWT** 的 handoff 契约，供 RN 与 Web Admin 对接。

---

## 2. 目标

1. 已建档且 `role === 1`、`status === 1` 的用户，可用有效 App JWT 换取 handoff ticket。
2. Web 凭 ticket 兑换 Admin 会话（与密码登录成功后的 Token / 用户结构一致）。
3. Ticket **短时、单次**；不可用于其它管理端业务接口。
4. 不新增明文密码通道；不改 Admin JWT 永不过期等既有策略。

---

## 3. 边界（非目标）

| 非目标                          | 说明                                       |
| ------------------------------- | ------------------------------------------ |
| 超管 bootstrap（无 `users` 行） | 本刀不支持 handoff；仍走密码登录           |
| 本地 / Redis 以外的持久票据库   | 默认同进程内存即可；多实例部署时再升 Redis |
| 改 `login` 密码流               | 浏览器手输密码登录保持不变                 |
| 吊销已有 Admin JWT              | 与现网一致                                 |
| App 侧存储管理员密码            | 明确不做                                   |

---

## 4. 详细需求

### 4.1 签发 Ticket

`POST /api/admin/auth/app-handoff`

| 项     | 要求                                                                  |
| ------ | --------------------------------------------------------------------- |
| 鉴权   | **App JWT**（`typ === "app"`，现行 App 校验）                         |
| 资格   | 对应用户存在；`role === 1`；`status === 1`；**非** bootstrap 无库态   |
| 成功   | HTTP 200；`data: { ticket: string; expiresIn: number }`（秒）         |
| Ticket | 服务端生成的不透明随机串（≥32 字节熵，编码为 URL-safe）               |
| TTL    | **60 秒**（`expiresIn: 60`）                                          |
| 存储   | 进程内 Map：`ticket → { userId, studentNo, expiresAt }`；过期可惰性清 |

**错误（沿用现有错误码风格）**

| 情况               | HTTP | code 建议                 | message 建议    |
| ------------------ | ---- | ------------------------- | --------------- |
| 未带 / 无效 App 票 | 401  | 现有 `40101` / `40102` 等 | 与 App 鉴权一致 |
| 非管理员           | 403  | `40302` `ADMIN_REQUIRED`  | 需要管理员权限  |
| 账号禁用           | 403  | `40301`                   | 账号已禁用      |

限流：与 Admin/App 登录同档（每 IP 15 分钟 60 次）或挂到现有 auth 限流中间件。

### 4.2 兑换 Ticket

`POST /api/admin/auth/handoff-redeem`

| 项        | 要求                                                                           |
| --------- | ------------------------------------------------------------------------------ |
| 鉴权      | 无 Bearer；Body `{ ticket: string }`                                           |
| 校验      | ticket 存在、未过期、未使用 → 标记已用 → 签发 **Admin JWT**（同密码登录）      |
| 成功      | 与 `POST /api/admin/auth/login` 成功 `data` 对齐：`token`、`loginType`、`user` |
| loginType | 固定回显 `"in_app"`（本通道仅服务 App 打开）                                   |
| 用户      | `{ id, studentNo, name, role: 1 }`；不出现 bootstrap                           |

**错误**

| 情况                 | HTTP | code 建议      | message 建议        |
| -------------------- | ---- | -------------- | ------------------- |
| 缺 / 空 ticket       | 400  | `40001`        | 参数错误            |
| 无效 / 过期 / 已使用 | 401  | `40102` 或专用 | Ticket 无效或已失效 |
| 用户已非管理员/禁用  | 403  | 对应码         | 与登录一致          |

兑换成功后无论后续客户端是否存盘，服务端 ticket 不得再次兑换。

### 4.3 安全

- Ticket 禁止写入业务日志明文（可打 hash 前缀）。
- 不返回管理员密码或哈希。
- Handoff 不替代密码登录；密码登录 Spec 不变。

### 4.4 文档同步

实现时更新 `docs/nongyu-node-server/接口文档概览.md` 增加上述两接口。

---

## 5. 业务流程

```
App（已登录 role=1）
  → POST /api/admin/auth/app-handoff (App JWT)
  → ticket
  → 打开 https://nongyu.site/admin/login?loginType=in_app&ticket=...
Web
  → POST /api/admin/auth/handoff-redeem { ticket }
  → Admin session → /workspace
```

---

## 6. 验收标准与测试方案

### 6.1 单元 / 集成测试（Node）

- [ ] `role=1` + 有效 App JWT：handoff 200，含 `ticket` 与 `expiresIn=60`。
- [ ] `role=0`：40302。
- [ ] 禁用账号：40301。
- [ ] 无 App JWT：401。
- [ ] redeem 一次成功，返回 Admin token；第二次同 ticket → 无效。
- [ ] 过期 ticket（可测时把 TTL 注入或改 expiresAt）→ 无效。
- [ ] redeem 成功后的 token 可调 `GET /api/admin/auth/me`。

### 6.2 联调

- [ ] 与 RN / Web Spec 联调：点入口进工作台，无需密码。

---

## 7. 修订记录

| 日期       | 说明              |
| ---------- | ----------------- |
| 2026-08-16 | 初版 handoff 契约 |

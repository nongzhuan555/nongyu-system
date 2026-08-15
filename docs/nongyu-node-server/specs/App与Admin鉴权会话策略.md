# Spec：App 与 Admin 鉴权会话策略

| 项       | 内容                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| 应用     | `apps/nongyu-node-server`（契约源）；联动 RN / Web Admin                                                           |
| 需求类型 | **基建**                                                                                                           |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/User/登录登出PRD.md`；`docs/forhuman/rawprds/nongyu-web-admin/用户登录PRD.md` |
| 状态     | **已实现**                                                                                                         |
| 日期     | 2026-08-15                                                                                                         |

---

## 1. 背景

现网 App JWT 默认 30 天，但「Token 无效或已失效」把**时钟过期、顶号、登出、设备不符、签名错误**混在同一 `40102`，客户端无法区分。同设备再次登录也会 `token_version++`，造成「刚登录就失效」的体感。管理端需要固定超级管理员入口：指定学号在业务表尚无记录时也能登录，且**不得反填 `users`**；待该学号在 RN 正常登录建档后再走常规用户行。

---

## 2. 目标

1. App Access Token TTL 默认 **60 天**；真过期返回可识别错误码。
2. 主动作废（顶号 / 登出 / 设备不符）与时钟过期**分码、分文案**。
3. **同 `deviceId` 再次 App 登录不 bump** `token_version`；换设备或登出仍 bump。
4. Admin JWT **不设 `exp`（永不过期）**；仍校验签名、`typ`、角色/超管身份、账号禁用。
5. 学号 **`202308596`** 为超级管理员：无 `users` 行也可登录；不写业务表；默认密码来自环境变量；有库后与自改哈希**双轨命中**；支持自助改密（有库后）。
6. 超管 bootstrap 会话能力受限，避免 `uid` 哨兵误写业务数据。

---

## 3. 边界（非目标）

| 非目标                     | 说明                                                                              |
| -------------------------- | --------------------------------------------------------------------------------- |
| Refresh Token / 滑动续期   | 本期不做                                                                          |
| 改密后吊销已发 Admin JWT   | 保持现网 Admin 不踢号                                                             |
| 将默认密码写入仓库 / DDL   | 仅环境变量；`.env.example` 占位                                                   |
| 无库时持久化自定义密码     | 无库阶段只认默认密码                                                              |
| 改造 Track 的 JWT 校验语义 | Track 仍验签名；若缺 `exp` 不因过期拒（Admin 票本不用于 Track；App 票仍带 `exp`） |
| 多超级管理员               | 仅约定单一学号                                                                    |

---

## 4. 详细需求

### 4.1 环境变量

| 变量                           | 必填                    | 说明                                                                       |
| ------------------------------ | ----------------------- | -------------------------------------------------------------------------- |
| `JWT_APP_TTL`                  | 否                      | 默认改为 **`60d`**（示例与 `env` default 同步）                            |
| `JWT_ADMIN_TTL`                | 否                      | **废弃语义**：Admin 签发不再使用 TTL；保留键以免旧 `.env` 报错，读取可忽略 |
| `SUPER_ADMIN_STUDENT_NO`       | 否                      | 默认 **`202308596`**（可覆盖，便于测试）                                   |
| `SUPER_ADMIN_DEFAULT_PASSWORD` | **生产/联调必填**（≥8） | 超管出厂默认密码明文；**禁止提交真实值**                                   |

### 4.2 App JWT

#### 签发

- 仍设 `iat` + `exp`（由 `JWT_APP_TTL`，默认 60d）。
- Claims 不变：`uid`、`studentNo`、`tokenVersion`、`typ:"app"`、`deviceId`。

#### 登录时 `token_version` / 设备

对**已存在用户**：

| 条件                                                                 | 行为                                                             |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 请求 `deviceId` 与库 `current_device_id` **相同**（均非空且相等）    | **不** `token_version++`；可更新资料、在线态、`last_login_at` 等 |
| `deviceId` **不同**或库中 `current_device_id` 为空后首次绑定到新设备 | `token_version++`；更新 `current_device_id` 与设备字段           |
| 登出                                                                 | 仍 `token_version++`，`is_online=0`                              |

新用户首次插入：`token_version` 初始仍为 `1`（与现网一致）。

若登录学号等于超管学号：创建或更新用户时 **`role` 置为 `1`**（不自动写入 `admin_password_hash`）。

#### 校验与错误码

| 情况                                                | HTTP | `code`                      | 建议文案                                                         |
| --------------------------------------------------- | ---- | --------------------------- | ---------------------------------------------------------------- |
| 缺 Bearer                                           | 401  | `40101` `UNAUTHORIZED`      | 未认证                                                           |
| 签名错误 / 载荷残缺 / `typ` 错误                    | 401  | `40102` `TOKEN_INVALID`     | Token 无效或已失效                                               |
| **`exp` 已过**（jose 过期）                         | 401  | **`40103` `TOKEN_EXPIRED`** | 登录已过期，请重新登录                                           |
| `token_version` 不符 / `deviceId` 不符 / 用户不存在 | 401  | **`40104` `TOKEN_REVOKED`** | 登录状态已失效，请重新登录（实现可再细分为顶号文案，见 RN Spec） |
| 账号禁用                                            | 403  | `40301`                     | 账号已禁用                                                       |

说明：`jwtVerify` 捕获过期时必须映射为 `40103`，不得再落入 `40102`。

### 4.3 Admin JWT

#### 签发

- **不调用** `setExpirationTime`（无 `exp`）。
- 普通管理员（库中 `role=1`）：claims 含 `uid`、`studentNo`、`role:1`、`typ:"admin"`；**无** `bootstrap`。
- 超管 **bootstrap**（库中无该学号用户）：`uid: 0`，`studentNo` 为超管学号，`role:1`，`typ:"admin"`，`bootstrap: true`。
- 超管学号在库中已存在且 `role=1`：按普通管理员签发（真实 `uid`，无 `bootstrap`）。若存在但 `role≠1`：App 登录路径应已纠正为 1；若仍非 1，登录失败 `40302`（防御）。

#### 校验

- 校验签名与 `typ==="admin"`、`role===1`。
- **不得**因缺少 `exp` 失败。
- `bootstrap===true`：校验 `studentNo` 为配置的超管学号且 `uid===0`；**不**查 `users`。
- 非 bootstrap：查库，用户存在、`status===1`、`role===1`（与现网一致）。不校验 `token_version` / 设备。

#### 登录密码（超管）

学号为超管学号时：

1. 若请求密码与 `SUPER_ADMIN_DEFAULT_PASSWORD` **恒定时间**比较相等 → 通过。
2. 否则若库中存在该用户且 `admin_password_hash` 非空，且 bcrypt 校验通过 → 通过。
3. 否则 → `40303` 管理员密码错误。

无库记录时仅路径 1 可用；**禁止** `INSERT users`。

非超管学号：保持现网（必须存在、`role=1`、仅哈希校验）。

#### Bootstrap 能力范围

| 接口                          | bootstrap 票                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `POST /api/admin/auth/login`  | 可用（发 bootstrap 票）                                                                                     |
| `GET /api/admin/auth/me`      | 可用；返回 `id:0`、`studentNo`、`name:"超级管理员"`、`role:1`、`bootstrap:true`                             |
| `POST /api/admin/auth/logout` | 可用（无服务端状态）                                                                                        |
| `PUT` 当前用户改密（见 §4.4） | **无库时 403**：提示先在 App 登录该学号完成建档                                                             |
| 其它 `/api/admin/**`          | **403**，业务码新建或复用 `40302`/`ADMIN_REQUIRED`，文案：**请先在 App 登录该学号完成建档后再使用管理功能** |

库中已有真实超管用户后，新登录发普通 Admin 票，能力与现网管理员相同。

### 4.4 管理员自助改密

- 新增（或明确）接口：`PUT /api/admin/auth/password`（需 Admin 鉴权，**非 bootstrap**）。
- Body：`{ "adminPassword": string }`，≥8 位。
- 将哈希写入**当前** `uid` 对应 `users.admin_password_hash`。
- 不 bump 任何 token version；已发 Admin JWT 仍有效。
- 现有 `PUT /api/admin/users/:id/admin-password` 保留（改他人）；规则不变。

### 4.5 文档同步

实现后更新：`接口文档概览.md`、`联调指南.md`、`.env.example`、`数据库设计文档.md` 中与 TTL / 错误码 / 超管相关的段落。

---

## 5. 业务流程

### 5.1 App 鉴权

```text
请求带 App JWT
  → 签名/载荷失败 → 40102
  → exp 过期 → 40103
  → version/设备/用户 → 40104
  → 禁用 → 40301
  → 通过
```

### 5.2 超管登录

```text
POST /api/admin/auth/login (studentNo=超管)
  → 密码 ≠ 默认 且 （无用户或哈希不匹配）→ 40303
  → 库无用户 → 签发 bootstrap Admin JWT（不写 users）
  → 库有用户 role=1 → 签发普通 Admin JWT
```

### 5.3 超管建档衔接

```text
RN App 登录学号=超管
  → 常规 upsert users，role 强制为 1
  → 不写 admin_password_hash（除非另调改密）
之后管理端可用：默认密码 OR 自改哈希
```

---

## 6. 验收与测试

### 后端（优先自动化）

- [ ] 默认 / 示例 `JWT_APP_TTL=60d`；新签 App Token 的 `exp - iat ≈ 60d`。
- [ ] 过期 App Token → HTTP 401 + `code=40103`。
- [ ] 登出或换设备后旧 Token → `40104`；同设备再登录旧 Token **仍有效**（version 未变）。
- [ ] Admin Token 无 `exp`；放置任意长时间后校验仍成功（单测可构造无 exp claims）。
- [ ] 超管学号、库中无用户、默认密码 → 登录成功；`users` 行数不增加。
- [ ] bootstrap 调用户列表等 → 403 + 建档提示。
- [ ] App 登录超管学号后出现 `users` 且 `role=1`；此后默认密码与自改密码均可登录管理端。
- [ ] 自助改密后旧 Admin JWT 仍可用；新密码与默认密码双轨仍可登录。

### 契约手测

- [ ] `.env` 未配 `SUPER_ADMIN_DEFAULT_PASSWORD` 时，超管登录失败信息明确（配置错误或密码错误，实现选定一种且文档写明）。

---

## 7. 修订记录

| 日期       | 说明                                                                                   |
| ---------- | -------------------------------------------------------------------------------------- |
| 2026-08-15 | 初版：60d App TTL、过期/作废分码、同设备不 bump、Admin 无 exp、超管 bootstrap 双轨密码 |
| 2026-08-15 | 实现落地（Node / RN / Web Admin）                                                      |

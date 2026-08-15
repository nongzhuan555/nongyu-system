# 实施计划：管理端 Track 指标代理

| 项   | 内容                                                   |
| ---- | ------------------------------------------------------ |
| Spec | `docs/nongyu-node-server/specs/管理端Track指标代理.md` |
| 应用 | `apps/nongyu-node-server`                              |
| 状态 | **已完成**                                             |

---

## 1. 实施计划

一人交付；编码走 backend-engineer（Express 路由 + 现有鉴权中间件 + `nodejs-backend-patterns`）。**先于**管理端大屏联调完成，前端才能接到 DAU/页面/性能/崩溃。

| 步骤 | 内容                                               | 风险 / 缓解                                    |
| ---- | -------------------------------------------------- | ---------------------------------------------- |
| 1    | env：`TRACK_BASE_URL` 默认 `http://127.0.0.1:8082` | 低；缺省不阻塞启动                             |
| 2    | `ErrorCodes` 增加 `50201` / `50301`                | 与 Spec 锁定一致                               |
| 3    | Track HTTP 客户端：5s 超时、Token、包映射          | 禁止把 Track URL/Token 写进对用户 `message`    |
| 4    | 四条 Admin 路由 + camelCase 映射                   | `pageSize`→`page_size`；overview 丢掉 `online` |
| 5    | 集成测：本地 mock HTTP Track，不断真实 Go          | `resetEnvCache` 后改 `TRACK_BASE_URL`          |
| 6    | 更新接口概览、联调指南；`.env.example`             | 与 Spec §4 一致                                |

**改动面**：`apps/nongyu-node-server/**` + `docs/nongyu-node-server/**`（接口概览 / 联调指南 / 本计划与 Spec 状态）。不改 Track / RN。

**不写**：dashboard overview 拼 DAU；`/v1/admin/jobs/*` 代理；使用时间分布。

---

## 2. 实施步骤

### 2.1 配置与错误码

1. `src/config/env.ts`：`TRACK_BASE_URL` 可选，zod 默认 `http://127.0.0.1:8082`，trim 去尾斜杠。
2. `.env.example` 增加注释：Node→Track Admin 使用现有 `INTERNAL_TOKEN`（对齐 Track `INTERNAL_TOKEN`）。
3. `src/lib/errors.ts`：

```ts
TRACK_BAD_GATEWAY: 50201,
TRACK_UNAVAILABLE: 50301,
```

4. `errorHandler` 已按 `AppError.httpStatus` 输出即可，确认 502/503 不会被收成 500。

### 2.2 Track 客户端（禁止散落 fetch）

建议路径：

```text
src/modules/track/trackClient.ts   # 请求 + 超时 + 错误映射
src/modules/track/map.ts           # snake → camel
src/modules/track/service.ts
src/modules/track/routes.ts
```

- 使用运行时 `fetch`（Node 18+），`AbortSignal.timeout(5000)`。
- Header：`X-Internal-Token: getEnv().INTERNAL_TOKEN`。
- 解析 Track `{ ok, data }` / `{ ok: false, error }`。
- 网络失败、超时、5xx、403 → `AppError(TRACK_UNAVAILABLE, "埋点服务暂不可用", 503)`。
- 其它 `ok: false` 或非 JSON → `AppError(TRACK_BAD_GATEWAY, "埋点指标查询失败", 502)`。

### 2.3 路由挂载

`app.ts`：

```ts
app.use("/api/admin/track", adminTrackRouter);
```

均 `requireProvisionedAdminAuth`。Query 用 zod：

| 路径        | 校验要点                                    |
| ----------- | ------------------------------------------- |
| `/overview` | `date` 可选 `YYYY-MM-DD`；缺省业务日当天    |
| `/dims`     | `metric` 枚举；非法 400 且 **不请求** Track |
| `/crashes`  | `from`/`to` 可选；`from>to` 400；`pageSize` |
| `/trend`    | `metric` 枚举；`from`/`to` 必填             |

业务日缺省：复用 `businessDayUtcRange` / 现有 time 工具得到 `YYYY-MM-DD`（与 dashboard 同一 `BUSINESS_TZ`）。

### 2.4 映射

- overview：`crash_count`→`crashCount` 等；**删除 `online`**。
- dims：`dim_key`→`dimKey` 等。
- crashes：条目 camelCase；分页壳与 Admin 列表一致（看现网 `PageResult` 字段名，与 posts 对齐）。
- `props` 转发前剥离键名匹配 `/password|token|authorization/i` 的项。
- trend：`{ points: [{ date, value }] }`。

### 2.5 测试

新文件 `tests/adminTrack.test.ts`：

1. `http.createServer` mock Track（按 path 返回 `ok: true` 的 snake_case）。
2. `process.env.TRACK_BASE_URL = mockUrl` → `resetEnvCache()`。
3. 建档管理员登录后：
   - overview 200，camelCase，无 `online`。
   - 非法 metric 400，mock 计数器仍为 0。
   - mock `destroy` 后 overview 503 / `50301`。
   - mock `ok: false` → 502 / `50201`。
   - 无 JWT → 401。
4. 断言 `GET /api/admin/track/jobs/aggregate` 为 404。

`tests/setup.ts` 不必强制设 `TRACK_BASE_URL`（有默认值）。

### 2.6 文档

- `接口文档概览.md`：§6.5 下增加 Track 代理四接口；清单表补行；删除/改写「DAU 本版不提供」。
- `联调指南.md`：curl 示例；表格「不含 DAU」改为走 `/api/admin/track/*`。
- Spec / 本计划状态改为已完成（编码验收后）。

---

## 3. 注意事项

- 管理端浏览器 **不得** 直连 Track；Token 只留在 Node。
- 不把 `TRACK_BASE_URL` 返回给客户端。
- 单请求内可 `Promise` 并行，禁止模块级按用户缓存指标。
- 超时 5s，避免拖死 Admin 网关。

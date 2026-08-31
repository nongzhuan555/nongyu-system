# Spec：埋点服务从 Go 迁移至 Node

| 项                   | 内容                                                                             |
| -------------------- | -------------------------------------------------------------------------------- |
| 需求类型             | **基建**                                                                         |
| 应用（新）           | `apps/nongyu-node-track-server`                                                  |
| 共享契约             | `packages/nongyu-track-contract`                                                 |
| 应用（旧，保留代码） | `apps/nongyu-go-track-server`（线上线下线，仓库不删）                            |
| 技术方案             | `docs/nongyu-go-track-server/tech/Go埋点迁移至Node技术方案.md`（**决策已锁定**） |
| HTTP 契约真相        | `docs/nongyu-go-track-server/接口文档.md`（字段级不重复抄写；实现须 100% 对齐）  |
| 原一期 Spec          | `docs/nongyu-go-track-server/specs/埋点服务一期.md`（行为语义继承）              |
| 状态                 | **已确认**；实施中                                                               |

---

## 1. 背景

农屿 Track 现网为 Go + SQLite，部署在独立 2C2G 机。团队以 TypeScript 为主，Go 增加协作与发布成本；同机写入压测表明在千人及以上写入强度下 Node+SQLite 可达标。

需要将 **同一职责、同一机器、同一 HTTP 契约** 的实现语言从 Go 换为 Node，且 **永不** 与业务 Node 同机合并。

---

## 2. 目标

1. Node Track **契约兼容** 替换 Go Track：App / 业务 Node BFF / 内部写入 **无需改协议**（可继续指向同一 Track 公网入口）。
2. 接管现网 `track.db`，历史大屏数据可查；行为语义对齐原一期 Spec + 接口文档（含幂等、部分成功、presence 回写、日聚合、purge、今日 live 查询）。
3. Node 版本与业务后端对齐；事件类型与 RN Telemetry SDK 共享契约包对齐。
4. 生产 CD **只发布 Node Track**；Go 代码与文档保留在仓库，但不再作为生产发布物。
5. 切换失败可在短时间内回滚到 Go 二进制（切换窗口内）。

---

## 3. 边界（非目标）

| 不做                                            | 说明                                                    |
| ----------------------------------------------- | ------------------------------------------------------- |
| 与业务 Node 同机 / 同进程                       | **长期禁止**                                            |
| 埋点原始事件写入业务 MySQL                      | 继续 SQLite                                             |
| 删除 `apps/nongyu-go-track-server` 或清空其文档 | 保留                                                    |
| 改 App 上报 Base URL 协议                       | 除非入口 IP/证书变更（本期不要求）                      |
| 多实例水平扩展写 / Redis / MQ                   | 仍单实例单 writer                                       |
| 重做管理端大屏 UI                               | 仅保证 BFF→Track Admin 契约仍通                         |
| 本期不强制改写全部历史 Go 选型表述              | 部署/选型文档需标明「现行实现为 Node」，Go 章保留为历史 |

---

## 4. 详细需求

### 4.1 运行与部署

| 需求         | 规格                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| 部署位置     | **原 Track 独立机**；整机仅 Nginx + Track + SQLite                                                              |
| 监听         | `127.0.0.1:8081`（与现网一致，由 Nginx 反代）                                                                   |
| Node 版本    | 与业务机一致（锁定时业务为 **v21.7.3**；随后同步升级）                                                          |
| HTTP 框架    | **Fastify**                                                                                                     |
| SQLite 驱动  | **better-sqlite3**                                                                                              |
| 进程守护     | systemd 单元名 **`nongyu-track.service`**（复用）；`ExecStart` 指向对齐版本的 `node` 绝对路径 + `dist/index.js` |
| 环境变量     | 继续使用 `/etc/nongyu-track.env`（键名兼容现网）                                                                |
| 数据目录     | `/var/lib/nongyu-track/`；**不重建空库**，接管现 `track.db`                                                     |
| 发布目录建议 | `/opt/nongyu-track/`（`dist` + production `node_modules`），与二进制路径解耦                                    |

### 4.2 HTTP 能力（必须全部实现）

实现 `接口文档.md` 全部路径（含后续已合入的 `llm-proxy-fails`、`sql/query` 等）：

| 路径                              | 角色                                   |
| --------------------------------- | -------------------------------------- |
| `GET /health`                     | 探活                                   |
| `POST /v1/track/events`           | App JWT 上报                           |
| `POST /v1/track/presence/offline` | App 离线                               |
| `POST /v1/internal/events`        | Internal Token 写入（可 SkipPresence） |
| `GET /v1/admin/overview`          | Admin                                  |
| `GET /v1/admin/metrics/trend`     | Admin                                  |
| `GET /v1/admin/metrics/dims`      | Admin                                  |
| `GET /v1/admin/crashes`           | Admin                                  |
| `GET /v1/admin/llm-proxy-fails`   | Admin                                  |
| `POST /v1/admin/sql/query`        | Admin 只读 SQL                         |
| `POST /v1/admin/jobs/aggregate`   | 运维                                   |
| `POST /v1/admin/jobs/purge`       | 运维                                   |

鉴权、错误码、`{ ok, data }` 包、批量部分成功、限流、`QUEUE_FULL`、今日 live 等 **不得另起一套**。

### 4.3 共享类型契约

| 需求       | 规格                                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 包名       | `packages/nongyu-track-contract`                                                                                                         |
| 内容       | 至少导出与 RN 现 `telemetry/types.ts` 对齐的 `TRACK_EVENT_TYPES`、`TrackEvent`、`TrackEventInput`、`TrackEventType`、`TrackIngestResult` |
| 服务端扩展 | `llm_proxy_fail` 等仅服务端/内部使用的类型须显式区分，避免 App SDK 误用                                                                  |
| 引用方     | `nongyu-rn-app` Telemetry 与 `nongyu-node-track-server` ingest **共同依赖**该包；禁止复制两份类型定义                                    |

### 4.4 领域行为（继承原一期，不得弱化）

- 单 writer 串行写 SQLite；队列有界；满则 `503 QUEUE_FULL`。
- `event_id` 幂等（`duplicated`）。
- Presence + 超时扫描 + usersync 回写业务 Node internal presence。
- 日聚合（00:10 上海昨日）与启动补跑；在线峰值采样；原始事件按现网策略 purge。
- Schema / 迁移对齐现网 migrations；启动自动迁移到兼容结构。

### 4.5 CI/CD

| 需求                                           | 规格                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| path filter                                    | 生产 Track 发布触发目录改为 `apps/nongyu-node-track-server/**`（及 `packages/nongyu-track-contract/**`） |
| `deploy-track`                                 | 停止 Go 交叉编译；改为 pnpm filter 构建 Node `dist` 并发布到 Track 机                                    |
| `publish-track.sh` / `deploy-nongyu-track.ps1` | 改为 Node 产物发布语义（健康检查与回滚保留）                                                             |
| Go 目录变更                                    | **不**再触发生产 Track 发布                                                                              |
| 密钥                                           | 可继续使用现有 `TRACK_SSH_*` secrets                                                                     |

### 4.6 Go 下线与保留

- 切换成功并观察通过后，生产 **停止 Go 进程**，仅 Node 承载流量。
- 仓库保留 `apps/nongyu-go-track-server` 与既有文档；文档注明现行实现为 Node。

---

## 5. 业务流程

### 5.1 切换（摘要）

```text
备份 track.db
  → Track 机安装对齐版本 Node + 依赖工具链
  → 部署 Node Track（可先影子端口验证）
  → 维护窗口：停 Go → 启 Node（8081）→ Nginx 不变
  → 探活 + App 抽样 + BFF overview
  → 观察 24–72h
  → CD 仅发 Node；Go 下线
```

### 5.2 回滚（切换窗口内）

systemd 指回 Go 二进制 + 原 env；若 Node 写坏数据则用切换前 db 备份覆盖（丢窗口内增量，需窗口内决策）。

---

## 6. 验收标准与测试方案

### 6.1 自动化（主）

1. **契约/单测**：ingest 校验、幂等、internal skip presence、admin overview/dims/今日 live、sqlguard 拒绝写语句；与 Go 现有关键用例语义对齐。
2. **共享包**：RN 与 Node Track 均能 type-check 依赖 `nongyu-track-contract`。
3. **构建**：`pnpm --filter nongyu-node-track-server build` 产出可启动的 `dist`。

### 6.2 手工 / 机上

1. `/health` 返回 db ok。
2. 带 App JWT 上报一批事件；重复 `event_id` 计 duplicated。
3. 经业务 Node BFF 拉 overview / crashes 可见数据（含接管的历史库）。
4. 心跳/离线后业务库在线态最终正确。
5. 写入压测不低于千人预估峰值：成功率 ≥ 99.9%，p95 &lt; 200ms，RSS 峰值 &lt; 300MB。
6. CD：仅改 Go 目录不发生产；改 Node Track 目录可走通发布 + health 回滚逻辑。

### 6.3 完成定义

- 本 Spec 经用户审查确认。
- 实现 100% 满足 §4；测试 §6.1 通过；§6.2 在 Track 机验收勾选。
- 生产流量由 Node Track 承载；Go 无线上流量。

---

## 7. 依赖文档

- `tech/Go埋点迁移至Node技术方案.md`
- `接口文档.md`
- `specs/埋点服务一期.md`
- `部署与发布.md`（迁移后需增补 Node 现行发布说明）

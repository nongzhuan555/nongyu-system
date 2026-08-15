# 实施计划：课表共享与 Diff

| 项       | 内容                                             |
| -------- | ------------------------------------------------ |
| Spec     | `docs/nongyu-rn-app/specs/课表共享与Diff.md`     |
| 技术方案 | `docs/nongyu-rn-app/tech/课表共享与Diff.md`      |
| 应用     | `apps/nongyu-rn-app` + `apps/nongyu-node-server` |
| 状态     | **已实现（待人工回归）**                         |

---

## 1. 里程碑

| 里程碑 | 内容                                                  | 风险                      |
| ------ | ----------------------------------------------------- | ------------------------- |
| M1     | Node：迁移 + course-share 模块 + 限流 + 错误码 + 挂载 | 低：镜像 course-ext       |
| M2     | RN 数据层：api / 本地开关缓存 / repository + 刷新挂钩 | 低                        |
| M3     | 设置页共享开关 + 隐私确认                             | 低                        |
| M4     | 课表页：他人查找 Sheet + peer 只读周视图              | 中：CourseScreen 模式分支 |
| M5     | Diff：占用矩阵 + 叠色图例 + 模式切换                  | 中：网格着色与连堂        |
| M6     | 验收：Spec §6 + lint/type-check；文档状态收尾         | 低                        |

**预计改动面**：

- 新建：`004_course_share.sql`、`node-server/modules/course-share/*`、`courseShareApi`、`courseShareLocalStore`、`courseShareRepository`、`courseShareDiff`、`PeerLookupSheet`、`CourseDiffLegend`
- 修改：`errors.ts`、`rateLimit.ts`、`app.ts`、`courseRepository.ts`、`courseUiStore.ts`、`CourseScreen` / `WeekGrid`（只读与 overlay）、`CourseSettingsScreen`

**不改**：course-ext CRUD、Agent tools、二维码/海报、昵称、历史学期。

---

## 2. 实施步骤

### 2.1 M1 Node 后端

1. `migrations/004_course_share.sql`（按技术方案 §3）
2. `ErrorCodes.COURSE_SHARE_NOT_FOUND = 40410`
3. `courseShareLookupRateLimit`（1 分钟 20 次 / uid）
4. `modules/course-share/{repo,mapper,routes}.ts`
5. `app.ts` 挂载 `/api/app/course-share`
6. 手工或单测：开/关清空、统一 404、不返回 name、限流

### 2.2 M2 RN 数据层

1. `courseShareApi.ts`：GET/PUT me、GET by-student
2. `courseShareLocalStore.ts`：`course:shareEnabled:{studentId}`
3. `courseShareRepository.ts`：enable / disable / syncIfEnabled / lookupPeer
4. `fetchAndPersistCourses` 成功后调用 `syncShareIfEnabled`

### 2.3 M3 设置页

1. `CourseSettingsScreen`：开关 + 说明文案
2. 开：无本地课表拦截 → Alert 隐私确认 → enable
3. 关：disable；进页时 GET /me 校准缓存

### 2.4 M4 查看他人

1. `courseUiStore`：`viewMode` / `peer` / `diffMode`
2. `PeerLookupSheet`：学号校验 + lookup
3. `CourseScreen`：peer 模式数据源切换；隐藏写操作；顶栏「正在查看」+ 返回
4. 失败/限流 Toast 文案对齐 Spec

### 2.5 M5 Diff

1. `courseShareDiff.ts`：周占用矩阵 + conflict/free
2. `WeekGrid`（或薄封装）overlay 着色
3. `CourseDiffLegend`：模式切换 + 图例
4. 切周重算；退出 Diff / 返回我的课表

### 2.6 M6 验收与收尾

1. 跑 Spec §6 清单
2. `pnpm --filter nongyu-node-server` / `nongyu-rn-app` type-check（及现有 lint）
3. Spec / Tech / Plan 状态改为已实现（待人工回归）
4. 不主动 git commit

---

## 3. 注意事项

- 严格按 Spec 边界；偏离先改文档再改代码
- 他人课表禁止写入 `course:entries:*`
- 关共享必须清空 `courses_json`
- 统一 404 文案，日志可记真实原因
- Coding Agent 不做 git 操作除非用户要求
- Bug 修复须写 `docs/common/BugLog.md`（若本轮有修 bug）

---

## 4. 修订记录

| 日期       | 说明                                                            |
| ---------- | --------------------------------------------------------------- |
| 2026-08-15 | 初版：技术方案确认后成文，待用户审查                            |
| 2026-08-15 | 用户确认计划；M1–M5 编码完成，待人工回归与迁移                  |
| 2026-08-15 | 回归修正（不新开里程碑）：详情只读基本信息；Diff 退出对比进顶栏 |

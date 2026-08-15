# 技术方案：课表共享与 Diff

| 项       | 内容                                                           |
| -------- | -------------------------------------------------------------- |
| Spec     | `docs/nongyu-rn-app/specs/课表共享与Diff.md`                   |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/Course/课表共享与Diff.md` |
| 应用     | `apps/nongyu-rn-app` + `apps/nongyu-node-server`               |
| 需求类型 | **业务**                                                       |
| 状态     | **已实现（待人工回归）**                                       |

---

## 1. 技术选型

| 领域     | 选型                         | 说明                                                       |
| -------- | ---------------------------- | ---------------------------------------------------------- |
| 远程存储 | MySQL 单表 JSON 快照         | 单用户课表约 5–15KB，无需 OSS                              |
| 远程 API | Express Router + Zod         | 镜像 `course-ext`；路径 `/api/app/course-share`            |
| 鉴权     | `requireAppAuth`             | 仅登录用户可开/关/查                                       |
| 限流     | `express-rate-limit`（已有） | 仅 `by-student`；按查询者 `userId`                         |
| RN 请求  | `appFetch`                   | 复用现有 JWT                                               |
| 本地标记 | MMKV                         | `course:shareEnabled:{studentId}` 缓存开关，减少刷新前 GET |
| 状态     | Zustand `courseUiStore` 扩展 | `viewMode` / `peer` / `diffMode`                           |
| Diff     | 客户端纯计算                 | 复用 `weekMatches`；无服务端 Diff API                      |
| 新增依赖 | **无**                       |                                                            |

---

## 2. 模块结构

### 2.1 Node（`apps/nongyu-node-server/`）

```text
migrations/
  004_course_share.sql
src/modules/course-share/
  routes.ts
  repo.ts
  mapper.ts
src/middlewares/rateLimit.ts   # 追加 courseShareLookupRateLimit
src/lib/errors.ts              # 追加 ErrorCodes.COURSE_SHARE_NOT_FOUND = 40410
src/app.ts                     # mount /api/app/course-share
```

### 2.2 RN（`apps/nongyu-rn-app/src/modules/course/`）

```text
data/
  courseShareApi.ts            # GET/PUT me、GET by-student
  courseShareLocalStore.ts     # shareEnabled 本地缓存
  courseShareRepository.ts     # 开/关/覆盖快照编排；刷新联动
model/
  courseShareDiff.ts           # 周占用矩阵 + conflict/free 叠色结果
store/
  courseUiStore.ts             # 扩展 viewMode / peer / diffMode
components/
  PeerLookupSheet.tsx          # 学号输入 BottomSheet
  CourseDiffLegend.tsx         # Diff 图例 + 模式切换
screens/
  CourseScreen.tsx             # 接入只读/Diff 模式；隐藏写操作
settings（跨模块）:
  CourseSettingsScreen.tsx     # 共享开关 + 隐私确认
```

---

## 3. 数据库设计

### 3.1 `004_course_share.sql`

```sql
CREATE TABLE IF NOT EXISTS course_share_snapshots (
  user_id BIGINT NOT NULL,
  student_no CHAR(9) NOT NULL,
  share_enabled TINYINT(1) NOT NULL DEFAULT 0,
  courses_json JSON NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  UNIQUE KEY uk_course_share_student_no (student_no),
  CONSTRAINT fk_course_share_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_course_share_student_no
    CHECK (student_no REGEXP '^[0-9]{9}$'),
  CONSTRAINT chk_course_share_enabled
    CHECK (share_enabled IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

约定：

- 关共享：`share_enabled=0` 且 `courses_json=NULL`
- 开共享 / 覆盖：`share_enabled=1` 且 `courses_json` 为 `CourseEntry[]`
- `student_no` 写入时取自当前用户行，防止客户端伪造学号

### 3.2 JSON 体量

服务端 Zod：`courses` 数组 `max(120)`；单条字段与 RN `CourseEntry` 对齐。超限 → `VALIDATION`。

---

## 4. API 设计

统一 envelope：`{ code, message, data }`。

### 4.1 `GET /api/app/course-share/me`

鉴权：App JWT。

响应 `data`：

```ts
{
  shareEnabled: boolean;
  updatedAt: string | null; // ISO；从未开启可为 null
}
```

设置页回显用；不强制返回完整 `courses`（减小流量）。

### 4.2 `PUT /api/app/course-share/me`

Body（Zod 联合）：

```ts
// 开启或覆盖
{ enabled: true; courses: CourseEntry[] }  // courses.length >= 1

// 关闭
{ enabled: false }
```

行为：

| enabled | 行为                                                                         |
| ------- | ---------------------------------------------------------------------------- |
| true    | upsert；`share_enabled=1`；写 `courses_json`；`student_no` 来自 JWT 对应用户 |
| false   | upsert/update；`share_enabled=0`；`courses_json=NULL`                        |

空数组开启 → `VALIDATION`（与 Spec「无本地课表不可开」一致，由客户端先拦，服务端再防）。

成功 `data`：同 `GET /me` 形状。

### 4.3 `GET /api/app/course-share/by-student/:studentNo`

- `studentNo`：`^\d{9}$`，否则 VALIDATION
- 中间件：`requireAppAuth` + `courseShareLookupRateLimit`
- 成功条件：目标用户存在 **且** `share_enabled=1` **且** `courses_json` 非空
- 否则：**统一** `AppError(40410, "未找到可查看的课表", 404)`（不区分原因）
- 成功 `data`：

```ts
{
  studentNo: string;
  courses: CourseEntry[];
  updatedAt: string; // ISO
}
```

**禁止**返回 `name` / 扩展实体。

### 4.4 限流

```ts
export const courseShareLookupRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => String(req.appAuth?.uid ?? req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 40001, // 或独立 42901；对外 message 固定
    message: "查询过于频繁，请稍后再试",
    data: null,
  },
});
```

仅挂在 `by-student`。

### 4.5 错误码

| code    | 场景                                                 |
| ------- | ---------------------------------------------------- |
| `40410` | `COURSE_SHARE_NOT_FOUND`：统一「未找到可查看的课表」 |
| `40001` | 校验失败 / 限流（限流 message 不同）                 |

服务端日志可记真实原因（无用户 / 未开 / 无 JSON），不回传客户端。

---

## 5. RN 数据层

### 5.1 `courseShareApi.ts`

```ts
getMyShareStatus(): Promise<{ shareEnabled: boolean; updatedAt: string | null }>
putMyShare(body: { enabled: true; courses: CourseEntry[] } | { enabled: false }): Promise<...>
getShareByStudentNo(studentNo: string): Promise<{ studentNo; courses; updatedAt }>
```

### 5.2 本地开关缓存

| key                               | 值            |
| --------------------------------- | ------------- |
| `course:shareEnabled:{studentId}` | `"1"` / `"0"` |

- 设置页开关成功后写入
- 冷启动设置页以 `GET /me` 为准回写缓存
- `fetchAndPersistCourses` 成功后：若缓存为开 → `PUT { enabled:true, courses }`；失败 Toast，不回滚本地课表

### 5.3 `courseShareRepository.ts`

| 方法                                     | 行为                                                           |
| ---------------------------------------- | -------------------------------------------------------------- |
| `enableShare(studentId)`                 | 读本地 courses；空则抛业务错误；确认后由 UI 调；`PUT` + 写缓存 |
| `disableShare(studentId)`                | `PUT enabled:false` + 缓存 0                                   |
| `syncShareIfEnabled(studentId, courses)` | 缓存为开则覆盖上传                                             |
| `lookupPeer(studentNo)`                  | `GET by-student`；成功返回 peer 载荷                           |

他人课表**不写** `course:entries:*`。

### 5.4 刷新挂钩

在 `fetchAndPersistCourses` 成功 `writeLocalCourses` 之后调用 `syncShareIfEnabled`（动态 import 或同层调用，避免循环依赖）。

---

## 6. 前端状态与 Diff

### 6.1 `courseUiStore` 扩展（会话内存）

```ts
viewMode: "self" | "peer" | "diff"
peer: { studentNo: string; courses: CourseEntry[]; updatedAt: string } | null
diffMode: "conflict" | "free"
```

- 进入 peer：`viewMode=peer`，写入 `peer`
- Diff：`viewMode=diff`（仍持有 `peer`）
- 返回自己：清空 `peer`，`viewMode=self`
- 登出：一并 reset

### 6.2 周网格数据源

| viewMode | courses 来源     | schedules/notes/todos |
| -------- | ---------------- | --------------------- |
| self     | 本地本人         | 正常合并              |
| peer     | `peer.courses`   | **强制空**            |
| diff     | 双源叠色（见下） | **强制空**            |

写操作入口（空格添加、详情编辑删除等）在 `peer`/`diff` 下全部禁用/隐藏。

课程详情弹层在 `peer`/`diff` 下为只读基本信息：不渲染备注/待办（含标题与 composer）；开学日始终读当前用户 `semesterStartMs`。

### 6.3 `courseShareDiff.ts`

对给定 `week`：

1. 用与 `buildWeekGrid` 相同的大课区间坐标（5×7），对本人 / 对方分别标记每格是否占用（连堂占多行时每行都算占用，或只标 primary——**推荐按格占用布尔矩阵**，连堂各行均为 occupied）。
2. `conflict`：
   - onlyMine / onlyPeer / both / neither
3. `free`：高亮 `neither`（双方皆空）；其它格降对比度或不着色。
4. UI：`WeekGrid` 增加可选 `overlay` prop，或 Diff 专用薄封装渲染色块 + 可选课名缩写。

图例组件切换 `diffMode`。

---

## 7. UI 实现要点

### 7.1 课表设置

- 开关「允许课表共享」+ 一行说明
- 开：`Alert` 隐私确认 → `enableShare`
- 关：直接 `disableShare`（或二次确认，推荐轻确认）
- 无本地课表：开关点开即 Toast，不发 PUT

### 7.2 课表页入口

- 顶栏工具区「他人」→ `PeerLookupSheet`（学号 + 查找）
- 成功：`setPeer` + `viewMode=peer`；顶栏标题「正在查看 {studentNo}」+ 新鲜度
- 工具区：`peer` 时「对比课表」+「返回我的课表」；`diff` 时「退出对比」占用原「对比课表」槽位 +「返回我的课表」
- 详情：`CourseDetailSheet` 增加只读开关，隐藏扩展区

### 7.3 Diff

- 同网格叠色；标题下方图例条仅冲突/空闲切换 + 色点，**不放**退出按钮
- 「回到本周」半圆 `topOffset` / 右缘位置与本人课表相同，Diff 时不下移
- 周切换沿用现有 `viewWeekIndex`，Diff 随周重算

---

## 8. 实现步骤

1. Node：迁移 `004` + `course-share` 模块 + 错误码 + 限流 + 挂载路由
2. Node：单元/集成测（开启、关闭清空、统一 404、限流、不返回 name）
3. RN：`courseShareApi` / LocalStore / Repository；挂钩 `fetchAndPersistCourses`
4. RN：设置页开关
5. RN：`courseUiStore` + PeerLookup + CourseScreen 只读模式
6. RN：Diff 矩阵 + 图例叠色
7. 修订 `specs/课表与用户数据存储约定.md`（与本文一致）
8. 人工回归 Spec §6 清单

---

## 9. 注意事项

| 项       | 说明                                                          |
| -------- | ------------------------------------------------------------- |
| 隐私     | 对外永不返回真实姓名；统一 404 文案                           |
| 枚举     | 限流 + 统一错误；日志可审计异常高频学号探测                   |
| 新鲜度   | UI 展示 `updatedAt`；过旧由用户自行判断                       |
| 体积     | JSON 很小；仍设 120 条上限防滥用                              |
| 一致性   | 共享快照与本地可短暂不一致（覆盖上传失败）；以 Toast 提示重试 |
| 存储约定 | 默认课表仍本地；仅 opt-in 上传原始快照                        |
| 非目标   | 二维码、Agent、历史学期、MMKV 缓存他人课表                    |

---

## 10. Grill 技术锁定

| #   | 结论                                  |
| --- | ------------------------------------- |
| T1  | 模块 `/api/app/course-share`          |
| T2  | 单表 JSON；关共享置 NULL              |
| T3  | GET/PUT me + GET by-student           |
| T4  | 1 分钟 20 次 / 查询者 userId          |
| T5  | 40410 + 统一文案                      |
| T6  | viewMode self/peer/diff + 客户端 Diff |
| T7  | 设置开关 + 课表「他人」Sheet          |
| T8  | 强制刷新成功且开启 → PUT 覆盖         |

---

## 11. 修订记录

| 日期       | 说明                                                               |
| ---------- | ------------------------------------------------------------------ |
| 2026-08-15 | 初版：技术 Grill 全推荐后成文，待用户审查                          |
| 2026-08-15 | 用户确认技术方案                                                   |
| 2026-08-15 | 对齐 Spec 回归：开学日用当前用户；详情只读基本信息；退出对比进顶栏 |

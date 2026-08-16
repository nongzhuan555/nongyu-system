# 技术方案：课表交互 UI 功能系列优化

| 项       | 内容                                                                      |
| -------- | ------------------------------------------------------------------------- |
| Spec     | `docs/nongyu-rn-app/specs/课表交互UI功能系列优化.md`                      |
| PRD      | `docs/forhuman/rawprds/nongyu-rn-app/Course/课表交互UI功能系列优化PRD.md` |
| 应用     | `apps/nongyu-rn-app` + `apps/nongyu-node-server`                          |
| 需求类型 | **混合**（主归业务）                                                      |
| 状态     | **已实现**（用户 2026-08-15；T1–T4 全走推荐）                             |

---

## 1. 技术选型

| 领域             | 选型                                         | 说明                                                  |
| ---------------- | -------------------------------------------- | ----------------------------------------------------- |
| 日程卡 / 考勤 UI | StyleSheet + `createThemedStyles`            | 对齐课表现有 Token；无新 UI 库                        |
| 翻牌动画         | `react-native-reanimated`（已有 4.5.1）      | `rotateY` + perspective；约 250ms                     |
| 手势             | `react-native-gesture-handler`（已有）       | 单击 / 双击区分；长按出菜单                           |
| 长按菜单         | 轻量自研 ActionSheet 或现有 BottomSheet 列表 | **优先**：简单 Modal/BottomSheet 两项操作，避免新依赖 |
| 确认框           | 已有 `confirm()`                             | `@/components/ui/confirm`                             |
| 埋点             | 已有 `track` / `perf`                        | `course_week_first_paint`                             |
| 本地存储         | MMKV `course:attendances:{studentId}`        | 与 schedules/notes/todos 同模式                       |
| 远程             | MySQL + Express `/api/app/course-ext`        | 新表 + CRUD；Outbox/Tombstone 扩 entity               |
| 懒周矩阵         | 内存 `Map<weekNumber, WeekGridData>`         | 窗口 ±2；滑出可删                                     |
| 新增 npm 依赖    | **无**                                       | —                                                     |

---

## 2. 模块改动一览

### 2.1 RN（`apps/nongyu-rn-app/src/modules/course/`）

```text
model/
  types.ts                 # + CourseAttendance；GridCell 增加 stack
  syncTypes.ts             # CourseExtEntity += "attendance"
  weekMatrix.ts            # 冲突叠入 stack；懒构建 API
  attendanceLabels.ts      # 可选：四态中文文案
data/
  courseExtLocalStore.ts   # + attendances MMKV
  courseExtApi.ts          # + attendance REST
  courseExtRepository.ts   # + CRUD / pull / outbox 分支
hooks/
  useCourseExt.ts          # snapshot + mutations 含 attendance
components/
  ScheduleCard.tsx         # 视觉重做
  StackedCellCard.tsx      # 新建：堆叠宿主 + 翻牌 + 角标
  CourseAttendanceSection.tsx  # 新建：详情内考勤
  CourseDetailSheet.tsx    # 挂考勤；+「在此时间添加日程」
  ScheduleFormSheet.tsx    # 去掉与课冲突拒绝（若有）
  WeekGrid.tsx             # 渲染 stack；长按；onLayout 上报钩子
  WeekPager.tsx            # 懒数据源 / extraData
screens/
  CourseScreen.tsx         # 确认刷新；按钮换位；首屏计时；stack 回调
```

### 2.2 Node（`apps/nongyu-node-server/`）

```text
migrations/
  005_course_attendances.sql
src/modules/course-ext/
  routes.ts / repo.ts / mapper.ts   # attendance CRUD + tombstone entity
```

`course_ext_tombstones.entity` 已为字符串，扩展 `"attendance"` 即可，**无需改表结构**（确认现迁移为 VARCHAR）。

---

## 3. 叠卡数据模型

### 3.1 GridCell

```ts
export type StackItem =
  { type: "course"; course: CourseEntry } | { type: "schedule"; schedule: ScheduleEntry };

export type GridStack = {
  kind: "stack";
  items: StackItem[]; // 长度 ≥ 1；有课则 items[0] 为 course
  spanRows: number; // 取 stack 内最大跨度（课程优先用课程 span；仅日程用该日程 span）
};

// 保留 occupied；废弃单独 primary/schedule 写入路径（构建时统一产出 stack | occupied | null）
export type GridCell = GridStack | GridOccupied | null;
```

**兼容**：`WeekGrid` 只认 `stack`；单元素 stack 即原 primary/schedule。

### 3.2 构建算法（`buildWeekGridWithSchedules`）

1. 先铺课程：每门课在起始格写入/合并入 `stack`（同格多课极少见；若冲突多课，按现网「后者跳过或并存」——**本期约定：同格多门课仍只保留先写入的一门课在 stack[0]，与旧行为一致**）。
2. 再铺日程：匹配周次后，若目标格为 `null` → 新建 `stack([schedule])`；若已是 `stack` → `items.push(schedule)`（课程已在前）；若跨行与已有内容冲突，span 截断到空位（与现 occupied 逻辑类似，但**不因有课而丢弃日程**）。
3. 排序：`items` 内 course 置顶；schedules 按 `createdAt` 升序。

### 3.3 `StackedCellCard`

- props：`items`、`height`、`fontScale`、`frontIndex`、`onFrontIndexChange`、`onOpenDetail(item)`、`onLongPress`。
- 单击：`items.length === 1` → `onOpenDetail`；否则翻牌 `index = (index+1)%n`。
- 双击：`react-native-gesture-handler` `Tap` maxTaps=2，或 Reanimated 双击；打开**当前**正面。
- 动画：外层 `Animated.View`，`transform: [{ perspective: 800 }, { rotateY }]`；`rotateY` 0→90° 时切换 child，再 90→0（或 -90→0），`withTiming(250)`。
- 角标：`{i+1}/{n}`，仅 `n>1` 显示。

### 3.4 正面索引状态

- 放 `CourseScreen` 或 `WeekGrid` 的 `useRef<Map<string, number>>`，key = `${weekIndex}:${day}:${startRow}`。
- `viewWeekIndex` 变化或 `CourseScreen` unmount：清空 Map（满足「重进/切周重置」）。

---

## 4. 考勤：库表 / API / 同步

### 4.1 迁移 `005_course_attendances.sql`

```sql
CREATE TABLE IF NOT EXISTS course_attendances (
  id CHAR(36) NOT NULL,
  user_id BIGINT NOT NULL,
  course_id VARCHAR(128) NOT NULL,
  week INT NOT NULL,
  day TINYINT NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_att_user_course_week_day (user_id, course_id, week, day),
  KEY idx_att_user (user_id),
  CONSTRAINT fk_att_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_att_day CHECK (day BETWEEN 1 AND 7),
  CONSTRAINT chk_att_status CHECK (status IN ('present','late','absent','leave'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4.2 REST（均 `requireAppAuth`）

| 方法   | 路径                                  | 说明                                                  |
| ------ | ------------------------------------- | ----------------------------------------------------- |
| GET    | `/api/app/course-ext/attendances`     | 当前用户全部                                          |
| POST   | `/api/app/course-ext/attendances`     | 创建（body 含 id；唯一冲突 → upsert 或 409 后改 PUT） |
| PATCH  | `/api/app/course-ext/attendances/:id` | 改 status                                             |
| DELETE | `/api/app/course-ext/attendances/:id` | 删 + tombstone                                        |

**推荐写路径**：客户端 upsert 统一 `POST`；服务端按唯一键存在则更新 status/`updated_at`（幂等，利于 outbox 重试）。

DTO 字段 camelCase，与 notes 一致：`courseId`、`week`、`day`、`status`、`createdAt`、`updatedAt`。

### 4.3 RN 同步

- `CourseExtEntity = "schedule" | "note" | "todo" | "attendance"`
- `pullCourseExt` 增加 list attendances + 合并；snapshot 增加 `attendances: CourseAttendance[]`
- `useCourseExt`：`upsertAttendance` / `deleteAttendance`
- 登出 `clearByStudentId` 含 attendances
- **共享 lookup**：不改返回体（本无考勤）；RN peer 不读 attendance

### 4.4 UI

- `CourseAttendanceSection`：四态 Chip；当前周/日由详情上下文传入（打开详情时带上 `weekNumber` + `course.day`）。
- `CourseDetailSheet` 增加 props：`weekNumber`、`attendance`、`onUpsertAttendance`、`onClearAttendance`；`readOnly` 时不挂载 section。

---

## 5. 懒构建周矩阵

```ts
function maxWeekFromAll(courses, schedules): number; // 已有

type WeekMatrixCache = {
  maxWeek: number;
  map: Map<number, WeekGridData>; // key = 1-based week
};

function ensureWeekWindow(
  cache: WeekMatrixCache,
  centerWeek: number, // 1-based
  courses: CourseEntry[],
  schedules: ScheduleEntry[],
  radius = 2,
): void {
  const lo = Math.max(1, centerWeek - radius);
  const hi = Math.min(cache.maxWeek, centerWeek + radius);
  for (let w = lo; w <= hi; w++) {
    if (!cache.map.has(w)) {
      cache.map.set(w, buildWeekGridWithSchedules(w, courses, schedules));
    }
  }
  // 可选：删除窗口外 key
}
```

- `CourseScreen`：`useMemo` 算 `maxWeek`；`useState`/`useRef` 持 cache；`viewWeekIndex` 变化时 `ensureWeekWindow`。
- `WeekPager`：`data` 长度为 `maxWeek`，`renderItem` 若缺矩阵则空占位 View（同高宽），进入窗口后有数据再绘 `WeekGrid`。
- courses/schedules 引用变化：整 cache `map.clear()` 后重建窗口。

---

## 6. 首屏埋点

```ts
// CourseScreen
const t0Ref = useRef(Date.now());
const paintedRef = useRef(false);

const onCurrentWeekLayout = () => {
  if (paintedRef.current || isPeerMode || loading) return;
  paintedRef.current = true;
  track({
    event_type: "perf",
    event_name: "course_week_first_paint",
    duration_ms: Date.now() - t0Ref.current,
    props: { week_index: viewWeekIndex, max_week: maxWeek },
  });
};
```

- 仅当 `WeekPager` 渲染的 **当前周** `WeekGrid` `onLayout` 触发。
- 同一次 mount 只报一次；peer/diff 不报。

---

## 7. 页头与刷新确认

```ts
// actions 顺序：刷新 → 查看他人 → 设置 → 开学日
const onPressRefresh = async () => {
  const ok = await confirm({
    title: "刷新课表",
    message: "将从教务重新拉取并覆盖本地课表，是否继续？",
    confirmText: "刷新",
    cancelText: "取消",
  });
  if (ok) void forceRefresh();
};
```

---

## 8. 日程冲突添加

- `WeekGrid`：`onLongPress` → 回调 `EmptyCellTarget` 等价时间位（有 stack 时用该格 day/periods）。
- `CourseDetailSheet`：按钮「在此时间添加日程」→ 同 target。
- 检索 `ScheduleFormSheet` / repository 若存在「与课程冲突」校验则删除；保留标题/节次/周次校验。

---

## 9. 实现步骤（概要）

1. Node：`005` 迁移 + attendance repo/routes/mapper；tombstone entity 支持。
2. RN types + localStore + api + repository + useCourseExt。
3. weekMatrix stack + 懒窗口 + WeekPager/WeekGrid 适配。
4. `StackedCellCard` + `ScheduleCard` 视觉 + 长按添加。
5. 考勤 Section + DetailSheet 接线。
6. CourseScreen：按钮/confirm/首屏埋点/stack index。
7. `pnpm lint` / `type-check` / `format`；手工验收 Spec §6。

---

## 10. 注意事项

- **Diff / peer**：`buildAllWeekMatrices` 仍可懒化；peer 无 schedules/attendances。
- **连堂 span**：stack 的 `spanRows` 以课程为准；仅日程冲突叠在短 span 上时，以该格起始行翻牌，occupied 行不响应手势。
- **双击与单击**：双击识别窗口内抑制第二次单击的翻牌（Gesture Handler 组合）。
- **唯一键 upsert**：避免 outbox 重复 create 产生多行。
- **旧 Spec**：实现后在 `课表扩展-自定义日程备注待办.md` 边界处加「冲突规则见课表交互 UI Spec」脚注。

---

## 11. 需你拍板的技术点（默认即推荐）

| #   | 问题                                                   | 推荐                 |
| --- | ------------------------------------------------------ | -------------------- |
| T1  | 同格多门**课程**仍只保留先写入一门？                   | 是（维持旧防御行为） |
| T2  | 长按菜单用 BottomSheet 简易列表，不引 ActionSheet 库？ | 是                   |
| T3  | 考勤写 API 用 POST upsert？                            | 是                   |
| T4  | 窗口外周矩阵是否主动删 cache？                         | 是（省内存）         |

请审查本技术方案。确认或按 T1–T4 调整后，再写实施计划。

# BugLog

> 每次 Bug 修复必须在此追加简明记录（根因 + 修复方法），便于追溯与复用。  
> 格式：日期 / 范围 / 现象 / 根因 / 修复。

---

## 2026-08-13 · nongyu-rn-app · 教务页 bundling 失败（白屏）

- **现象**：进入教务相关路由后 Metro `Android Bundling failed`；日志提示 `iconv-lite` 导入 Node 内置 `string_decoder` 失败。
- **根因**：`nongyu-tool-jiaowu` 用 `iconv-lite` 解教务 GBK 响应；该库会 `require("string_decoder")`，Hermes/Metro 默认不含 Node 标准库。
- **修复**：在 `apps/nongyu-rn-app/metro.config.js` 的 `resolver.extraNodeModules` 将 `string_decoder`、`buffer` 映射到 npm polyfill；App 显式依赖 `string_decoder`、`buffer`。重启 Metro（建议 `--clear`）后生效。

## 2026-08-13 · nongyu-rn-app · 悬浮底栏 `blurTarget` 未接通

- **现象**：Metro 反复 WARN：`dimezisBlurViewSdk31Plus` 未配置 `blurTarget`，Blur 回退为 `none`。
- **根因**：`FloatingTabBar` 写在 `BlurTargetRoot`（Provider+Surface 合一）外侧，拿不到 Context，Android 毛玻璃采样目标为空。
- **修复**：拆成 `BlurTargetProvider` + `BlurTargetSurface`；Provider 同时包住页面与底栏，Surface 只包 Tab 页面作采样目标（见 `BlurTargetContext.tsx`、`app/(tabs)/_layout.tsx`）。

## 2026-08-13 · nongyu-rn-app · 预览闪退出 Dev Client 壳

- **现象**：热更新/进首页后原生壳直接闪退；Metro 同时刷 SecureStore Invalid key。
- **根因**：
  1. 网站搜索框在 `BlurTargetView` **内部**再套 `GlassPanel`/`BlurView`，Android 嵌套真模糊易原生崩溃；
  2. SecureStore key 使用了非法字符 `:`（如 `jiaowu:student_id`），冷启动读凭据抛错。
- **修复**：搜索框改为半透明白底玻璃拟态（不套 BlurView）；凭据 key 改为 `jiaowu_student_id` / `jiaowu_password`，读写加 try/catch。真模糊仅用于底栏等 **BlurTarget 外侧** 组件。

## 2026-08-13 · nongyu-rn-app · 首页通知栏整栏消失

- **现象**：首页问候下方通知栏不见（反复出现）。
- **根因**：
  1. `useNoticeBootstrap` / `NoticeBar` 在无数据时 `notice=null` + `return null`；
  2. 《广场功能》Spec §4.6 / 验收 #8 曾写「无公告优先隐藏」，后续广场联调改动按旧 Spec 又盖回隐藏逻辑。
- **修复**：无 Token / 无数据 / 失败一律回退 `FIXED_NOTICE`；`notice` 恒有值；同步修订《广场功能》Spec/Plan 为「禁止隐藏、必须占位」。

## 2026-08-13 · nongyu-rn-app · AI 引导气泡文案变省略号

- **现象**：农屿 AI 入口气泡只显示「…」，完整提示文案看不到。
- **根因**：气泡挂在仅圆钮宽度的 `aiAnchor` 内；Android 上绝对定位子视图未设宽度时会吃到父宽，再叠加 `numberOfLines={1}` 即被截成省略号。
- **修复**：气泡容器给明确宽度（约 210）、去掉单行截断；`aiAnchor` 设 `overflow: visible`。

## 2026-08-13 · nongyu-rn-app · 帖子详情缺骨架屏

- **现象**：打开帖子详情首次加载仅显示「加载中…」文案，无骨架。
- **根因**：实现时详情态只写了文本 hint，未复用 `SkeletonBox` 做标题/正文占位。
- **修复**：新增 `PostDetailSkeleton`，`PostDetailScreen` 在 `isPending` 时渲染；Spec §4.4 补「首次加载须骨架」。

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

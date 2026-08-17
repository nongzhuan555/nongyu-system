# Pushy 版本管理手册

面向 `apps/nongyu-rn-app` 的**发版操作说明**（给人看的步骤书）。

| 想查什么               | 去哪看                                                               |
| ---------------------- | -------------------------------------------------------------------- |
| 产品/验收契约          | [`specs/Pushy版本管理与热更新.md`](./specs/Pushy版本管理与热更新.md) |
| 长期选型为什么用 Pushy | [`技术选型.md`](./技术选型.md) §7                                    |
| 发布摘要（一句带过）   | [`开发文档.md`](./开发文档.md) §7                                    |
| **具体怎么操作**       | **本文**                                                             |

**本期不做**：自研 Node `GET /api/app/versions/check`；客户端版本检查与热更下载**只走 Pushy**。

---

## 0. 先选你要走哪条路

改完代码后，用下面三问决定发版方式：

```
这次改动有没有碰原生？
（原生依赖 / 权限 / app.json 插件 / Expo SDK / 闪屏原生配置等）
        │
        ├─ 有 → 【路径 A】打新壳 + upload 基准包 + 侧载分发（§4）
        │
        └─ 没有（纯 JS / 样式 / 业务逻辑）
                │
                └─ 线上用户手里的 APK/IPA 已经在 Pushy 上传过基准包？
                        │
                        ├─ 是 → 【路径 B】只发 JS 热更（§5）
                        └─ 否 → 仍走路径 A（没有基准包就热更不上）
```

| 路径   | 典型场景                              | 用户要做什么                     |
| ------ | ------------------------------------- | -------------------------------- |
| A 换壳 | 加原生库、改权限、升 Expo、改闪屏插件 | **卸旧装新**（或按 §6 强制换壳） |
| B 热更 | 改页面、接口、文案、样式              | 一般无感；**再冷启动一次**后生效 |

---

## 1. 两层版本（只记这点）

农屿**不上应用商店**，靠「侧载安装包 + Pushy 热更」发版。可以想成两层：

| 层         | 用户感知              | 版本号写在哪                                                      | 怎么发出去                                    |
| ---------- | --------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| **原生壳** | 安装的那个 APK/IPA    | `app.json`：`version` + Android `versionCode` + iOS `buildNumber` | EAS 打出包 → `pushy uploadApk/Ipa` → 侧载分发 |
| **热更包** | 壳不变，JS/资源被替换 | Pushy 控制台里的热更包（设置页可看 hash；无则显示「基准包」）     | `pushy bundle` → publish                      |

```
┌─────────────────────────────────────┐
│  用户手机上的 APK（原生壳）          │  ← 路径 A 才换
│  ┌───────────────────────────────┐  │
│  │  JS Bundle + 图片等资源        │  │  ← 路径 B 只换这一层
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**三条硬约束（不懂就先背住）：**

1. **分发给用户的 APK，必须和上传到 Pushy 的是同一份文件**（同一构建产物）。不要「upload 一份、再另编一份拿去发」。
2. **同版本号重新编译后，必须重新 upload**，否则用户装了新编的包却对不上旧基准，可能领不到热更。
3. **禁止安装 `expo-updates`**（和 Pushy 冲突）。打壳仍用 EAS Build。

设置里「应用版本 / 构建号」来自原生壳；「热更」一行是 Pushy 当前 hash（见「设置 → 版本」）。

---

## 2. 怎么跑 `pushy` 命令（Windows 必看）

CLI 包名：`react-native-update-cli`；真正的命令名是 **`pushy`**（不是包名）。

所有命令默认在：

```bash
cd apps/nongyu-rn-app
```

### 2.1 推荐：不装全局，用 npx

本机若 `npm i -g` 报 `EPERM`（写不了 `node_global`），不要硬装。用：

```bash
npx --yes -p react-native-update-cli pushy <子命令>
```

示例：

```bash
npx --yes -p react-native-update-cli pushy login
npx --yes -p react-native-update-cli pushy selectApp --platform android
npx --yes -p react-native-update-cli pushy uploadApk ./path/to/app.apk
npx --yes -p react-native-update-cli pushy bundle --platform android
```

说明：

- `-p react-native-update-cli`：告诉 npx 用哪个包
- 后面的 `pushy`：包里注册的可执行文件名
- 直接写 `npx react-native-update-cli …` 会报 **could not determine executable to run**（包名 ≠ 命令名）

下文为简洁仍写 `pushy xxx`；你本地请自行换成上面的 `npx --yes -p … pushy xxx`。

### 2.2 可选：全局安装

有写权限时：

```bash
npm i -g react-native-update-cli
pushy login
```

### 2.3 配置文件

| 路径                                     | 是否入库     | 说明                            |
| ---------------------------------------- | ------------ | ------------------------------- |
| `apps/nongyu-rn-app/update.json`         | 可入库       | 按平台存 `appId` / `appKey`     |
| `apps/nongyu-rn-app/update.json.example` | 可入库       | 占位模板                        |
| `apps/nongyu-rn-app/.update`             | **禁止**入库 | CLI 登录态（已在 `.gitignore`） |

Android / iOS **各建一个** Pushy 应用，各有一套 key。客户端按 `Platform.OS` 读对应项（`src/modules/update/PushyUpdateProvider.tsx`）。

也可在 [Pushy 控制台](https://pushy.reactnative.cn/) 建好应用，把 key 手写进 `update.json`。

**改 `update.json` 后**：要进正式壳须**重新打壳**；仅热更时，当次 `bundle` 会带上当前仓库里的配置。

---

## 3. App 里已经接好的行为（运维只需知道结果）

| 项               | 行为                                                        |
| ---------------- | ----------------------------------------------------------- |
| SDK              | `react-native-update`（`UpdateProvider`）                   |
| 下载策略         | `silentAndLater`：后台静默下完，**下次冷启动**才换成新 JS   |
| 检查时机         | 冷启动 + 从后台回到前台                                     |
| 设置页           | 「设置 → 版本」看版本号 / 构建号 / 热更；可手动「检查更新」 |
| 开发态 `__DEV__` | 默认不自动检查；正式包或带 Pushy 的壳里验证                 |
| 无效 / 空 appKey | 不挂更新逻辑，App 照常开；版本页仍可进                      |

一期**没有**自定义强制更新弹窗、应用内静默装 APK。必须换壳时走 §6。

---

## 4. 路径 A：打正式壳 + 上传基准包 + 侧载分发

适用：第一次正式发版，或改了原生相关内容。

### 4.1 升版本号（手动，EAS 不会自动加）

改 `apps/nongyu-rn-app/app.json`：

| 字段                  | 含义                       | 规则                 |
| --------------------- | -------------------------- | -------------------- |
| `expo.version`        | 用户看到的版本，如 `1.0.1` | SemVer，展示用       |
| `android.versionCode` | Android 整数构建号         | **每次新壳必须 +1**  |
| `ios.buildNumber`     | iOS 构建号字符串           | **每次新壳单调递增** |

`eas.json` 里是 `"appVersionSource": "local"`，版本以本地 `app.json` 为准。

### 4.2 构建

```bash
cd apps/nongyu-rn-app
pnpm eas:build:prod
# 环境变量见 eas.json production（API / Track 等）
```

或本地：`pnpm prebuild` 后再打 release（需本机 Android/iOS 工具链）。

### 4.3 选中 Pushy 应用并 upload

```bash
pushy login                                          # 首次
pushy selectApp --platform android                    # 选中农屿 Android
pushy uploadApk <刚才构建得到的那个.apk路径>

# iOS
pushy selectApp --platform ios
pushy uploadIpa <path-to-the-exact-ipa>
```

首次没有应用时用 `pushy createApp --platform android`（或 ios），或控制台创建后把 key 写入 `update.json`。

### 4.4 分发

把 **upload 的同一份** APK/IPA 放到侧载渠道（OSS / 蒲公英 / 内测页等）。  
用户安装这份包后，才具备接收后续热更的「基准壳」。

---

## 5. 路径 B：只发 JS 热更

前提（缺一不可）：

- 本轮**没改原生**
- 用户已安装的壳，对应版本已在 Pushy **upload** 过

```bash
cd apps/nongyu-rn-app
pushy selectApp --platform android
pushy bundle --platform android
# 按 CLI 提示 publish，并绑定到正确的原生 packageVersion（对应壳版本）

pushy selectApp --platform ios
pushy bundle --platform ios
```

**用户侧**：启动（或回前台）检查 → 静默下载 → **再完全退出再打开一次（冷启动）**后业务变更才生效。  
内测说明里建议写清「需重启 App」。

---

## 6. 强制换壳（旧原生包过期）

适用：用户必须装新壳（新原生模块、权限、Expo 大版本等）。

1. 按 §4 打好新壳、upload、侧载分发新包。
2. 在 Pushy 后台把**旧**原生包标为过期（`expired`）。
3. 给旧包配置 `downloadUrl`，指向新 APK/IPA 的**非商店**下载地址。

一期客户端不自定义换壳 UI，依赖 Pushy 默认能力。品牌化弹窗另开 Spec。

---

## 7. 常见问题

| 现象                             | 原因 / 处理                                                 |
| -------------------------------- | ----------------------------------------------------------- |
| `pushy: command not found`       | 未装 CLI；用 §2.1 的 `npx -p … pushy`                       |
| `EPERM` 全局安装失败             | 全局目录无写权限；改用 npx，不要强行 `npm i -g`             |
| `could not determine executable` | 写了 `npx react-native-update-cli`；应写成 `npx -p … pushy` |
| Expo Go 无热更                   | 预期；须 Dev Client / release 壳                            |
| 开发态 Metro 不检查更新          | 预期（`__DEV__`）；用正式包验证                             |
| 有热更但不生效                   | 是否只下完没再冷启动；publish 是否绑错原生 `packageVersion` |
| 永远领不到热更包                 | 安装包与 upload 基准不是同一构建；或重编译后未再 upload     |
| 启动崩溃怀疑 Pushy               | 查 `update.json` 平台项；临时清空 `appKey` 应能直通启动     |
| 与 EAS Update 混用               | 禁止；不要装 `expo-updates`                                 |

---

## 8. 与仓库其它文档的关系

| 文档                             | 角色                                |
| -------------------------------- | ----------------------------------- |
| 本手册                           | 人操作：CLI、打壳、热更、换壳、排错 |
| `specs/Pushy版本管理与热更新.md` | 一期产品 / 验收契约                 |
| `技术选型.md` §7                 | 长期选型约束                        |
| `开发文档.md` §7                 | 发布摘要（细节以本手册为准）        |
| Node `app_versions` API          | 自研元数据，**本期客户端不用**      |

---

## 9. 修订记录

| 日期       | 说明                                                                 |
| ---------- | -------------------------------------------------------------------- |
| 2026-08-15 | 初版：配合 Pushy 一期客户端接入                                      |
| 2026-08-15 | 增量：`checkStrategy=both`；设置「版本」页手动检查                   |
| 2026-08-17 | 重写：决策树 + 两层示意 + 路径 A/B 清单；补充 Windows CLI / npx 踩坑 |

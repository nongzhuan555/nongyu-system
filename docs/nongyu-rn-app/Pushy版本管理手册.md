# Pushy 版本管理手册

面向 `apps/nongyu-rn-app` 的发版与热更操作说明。客户端一期策略见 Spec：[`specs/Pushy版本管理与热更新.md`](./specs/Pushy版本管理与热更新.md)；选型见 [`技术选型.md`](./技术选型.md) §7。

**本期不使用**自研 Node `GET /api/app/versions/check`；版本检查与热更下载均走 Pushy 云端。

---

## 1. 概念：两层版本

| 层     | 含义                                                                                         | 谁改                                      | 工具                                                                     |
| ------ | -------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| 原生壳 | 用户安装的 APK/IPA；对应 `app.json` 的 `version` + Android `versionCode` / iOS `buildNumber` | 加了原生依赖、改权限/插件、升 Expo SDK 等 | EAS Build / 本地 Gradle·Xcode → **必须** `pushy uploadApk` / `uploadIpa` |
| 热更包 | JS Bundle + 静态资源                                                                         | 纯业务/样式/逻辑                          | `pushy bundle` → publish                                                 |

硬约束：用户手里的安装包必须与 Pushy 上已 upload 的**同一份基准包**一致（含编译产物）。同版本号重新编译后必须重新 upload，否则可能领不到热更。

禁止安装 `expo-updates`（与 Pushy 冲突）。仍可用 EAS Build 打壳。

---

## 2. 账号与配置文件

### 2.1 文件

| 路径                                     | 是否入库     | 说明                            |
| ---------------------------------------- | ------------ | ------------------------------- |
| `apps/nongyu-rn-app/update.json`         | 可入库       | 按平台存 `appId` / `appKey`     |
| `apps/nongyu-rn-app/update.json.example` | 可入库       | 占位模板                        |
| `apps/nongyu-rn-app/.update`             | **禁止**入库 | CLI 登录态（已在 `.gitignore`） |

Android 与 iOS **必须分别**创建 Pushy 应用，各有一套 key。客户端用 `Platform.OS` 读取对应项（见 `src/modules/update/PushyUpdateProvider.tsx`）。

### 2.2 首次配置（CLI）

在 `apps/nongyu-rn-app` 目录：

```bash
npm i -g react-native-update-cli
pushy login
pushy createApp --platform android   # 或 selectApp
pushy createApp --platform ios
```

也可在 [Pushy 控制台](https://pushy.reactnative.cn/) 创建后，把 `appId` / `appKey` 手写进 `update.json`。

改 `update.json` 后需重新打包才能进 release 包；热更包会打进当次 JS bundle。

---

## 3. 客户端策略（已接入）

| 项               | 值                                                                              |
| ---------------- | ------------------------------------------------------------------------------- |
| SDK              | `react-native-update`（`UpdateProvider` + `Pushy`）                             |
| `updateStrategy` | `silentAndLater`：静默下载，**下次冷启动**生效                                  |
| `checkStrategy`  | `both`：冷启动 + 从后台回前台均检查                                             |
| 设置页           | 「设置 → 版本」查看版本号并手动「检查更新」                                     |
| `__DEV__`        | 默认不检查更新（勿开 `debug: true`，除非专门调试）；设置页手动检查会 Toast 说明 |
| 无效 `appKey`    | 不挂载更新逻辑，App 正常启动；版本页仍可打开                                    |

自定义强制热更弹窗、应用内装 APK：**非本期**。强制换壳见 §6。

原生模块变更后须重打 Dev Client / release 壳；仅改 JS Provider 配置后，已含 Pushy 原生的壳可热更本段逻辑本身。

---

## 4. 打正式壳并上传基准包

### 4.1 升版本号

改 `app.json`：

- `expo.version`（展示用 SemVer，如 `1.0.1`）
- Android：`android.versionCode`（单调递增整数）
- iOS：`ios.buildNumber`（单调递增）

### 4.2 构建

```bash
cd apps/nongyu-rn-app
pnpm eas:build:prod
# 或本地：pnpm prebuild && 再打 release
```

### 4.3 Upload + 分发（同一文件）

```bash
cd apps/nongyu-rn-app
pushy selectApp --platform android   # 确保选中农屿 Android 应用
pushy uploadApk <path-to-the-exact-apk>

# iOS
pushy selectApp --platform ios
pushy uploadIpa <path-to-the-exact-ipa>
```

然后把**刚才 upload 的同一份** APK/IPA 放到侧载渠道（OSS / 内测平台等），不要另编一份再分发。

---

## 5. 发布 JS 热更

仅当当前线上用户壳已在 Pushy upload 过，且未改原生依赖时：

```bash
cd apps/nongyu-rn-app
pushy bundle --platform android
# 按 CLI 提示 publish，并绑定到对应原生 packageVersion

pushy bundle --platform ios
# 同上
```

用户侧行为（一期）：启动检查 → 静默下载 → **再冷启动一次**后业务变更生效。

建议在热更说明里写清「需重启 App」，便于内测验证。

---

## 6. 强制换壳（原生包过期）

适用：必须安装新壳（新原生模块、权限、Expo 大版本等）。

1. 打好并 upload 新壳，按 §4 分发新包。
2. 在 Pushy 后台将**旧**原生包标为过期（`expired`）。
3. 为旧包配置 `downloadUrl`，指向新 APK/IPA 的**非商店**下载地址。

一期客户端不自定义换壳 UI；依赖 Pushy 默认能力与运营配置。后续若要品牌化弹窗，另开 Spec。

---

## 7. 常见问题

| 现象                    | 排查                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| Expo Go 无热更          | 预期；须 Dev Client / release 壳                                  |
| 开发态 Metro 不检查更新 | 预期（`__DEV__`）；正式包验证                                     |
| 有热更但不生效          | 是否只下完没再冷启动；是否绑错原生 `packageVersion`               |
| 永远领不到包            | 安装包是否与 upload 基准不一致；是否用了重编译未再 upload 的包    |
| 启动崩溃疑 Pushy        | 看 `update.json` 是否缺平台项；临时清空 `appKey` 应能启动（直通） |
| 与 EAS Update 混用      | 禁止；不要装 `expo-updates`                                       |

---

## 8. 与仓库其它文档的关系

| 文档                             | 角色                           |
| -------------------------------- | ------------------------------ |
| 本手册                           | 人操作：配置、打壳、热更、换壳 |
| `specs/Pushy版本管理与热更新.md` | 一期产品/验收契约              |
| `技术选型.md` §7                 | 长期选型约束                   |
| `开发文档.md` §7                 | 发布摘要（细节以本手册为准）   |
| Node `app_versions` API          | 自研元数据，**本期客户端不用** |

---

## 9. 修订记录

| 日期       | 说明                                               |
| ---------- | -------------------------------------------------- |
| 2026-08-15 | 初版：配合 Pushy 一期客户端接入                    |
| 2026-08-15 | 增量：`checkStrategy=both`；设置「版本」页手动检查 |

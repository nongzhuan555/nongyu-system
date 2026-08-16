# nongyu-node-server 同机部署与 IP HTTPS — 技术方案（学习用）

| 项       | 内容                                                                       |
| -------- | -------------------------------------------------------------------------- |
| 版本     | v1.0                                                                       |
| 日期     | 2026-08-16                                                                 |
| 需求类型 | 基建                                                                       |
| 用途     | 讲清楚 **这次为什么这样部署**、**HTTPS/证书在做什么**、**现网落在哪**      |
| 配套操作 | `docs/nongyu-node-server/部署与发布.md`（日常发布清单，偏 HOW 的短表）     |
| 敏感信息 | **本文不写**真实 IP / SSH 口令 / 库口令 / JWT。本机见 gitignore 的连接文档 |

---

## 0. 你先建立的心智模型

把一次 HTTPS 访问拆成四层，后面所有「证书、Nginx、安全组」都挂在这上面：

```text
1. 传输：客户端 ↔ 服务器之间的 TCP 连接（端口 443 或 80）
2. 加密：TLS（常被口语叫 SSL/HTTPS）在 TCP 之上协商密钥，之后 HTTP 明文被包进密文
3. 身份：服务器出示「证书」，证明「你正在跟证书里写的那个名字/IP 说话」
4. 应用：解密后的 HTTP 到达 Nginx，再被反代到本机 Node，Node 再查 MySQL
```

没有第 3 步（证书被系统信任）时，浏览器会报警，React Native 的 `fetch` 也会直接失败。所以「用 IP 开 HTTPS」的难点不在 Nginx 语法，而在 **能不能拿到一张设备默认信任的、且 SAN 里写的是这台机器公网 IP 的证书**。

---

## 1. 背景：这次部署要解决什么

### 1.1 业务目标

- 把 monorepo 里的 `apps/nongyu-node-server`（Express + TypeScript）放到 **已经在跑线上 MySQL 的那台云主机**上。
- 客户端用 **`https://<公网IP>`** 访问（当时没有为 API 单独买域名）。
- 本机改完代码后，能 **一键覆盖远端 `dist` 并自动重启** Node，而不是在服务器上 `tsx watch`。

### 1.2 机器上原来有什么（2026-08-16 探活）

| 项           | 当时状态                                                                         |
| ------------ | -------------------------------------------------------------------------------- |
| OS           | CentOS 8，x86_64，约 2C / 1.7G 内存                                              |
| MySQL        | 8.0.26，`mysqld` 监听 `*:3306`（已有业务库，**禁止动安装**）                     |
| 旧 API       | PM2 进程 `nongyu-server`，`node /var/www/nongyu-server/...`，监听 `0.0.0.0:3000` |
| 旧管理端静态 | Nginx `:80` 提供 `/var/www/nongyu-admin` SPA                                     |
| 旧反代坑     | `proxy_pass http://localhost:3000/;` **带尾斜杠**，会把 URI 前缀 `/api` 剥掉     |
| Node 运行时  | nvm 的 Node **v21.7.3**（路径在 `/root/.nvm/versions/node/...`）                 |
| Nginx        | 1.14.1，当时 **没有监听 443**                                                    |
| Python       | 系统 Python **3.6**（装不了 Certbot 5.4）                                        |

旧 API 已用新 systemd 服务替换；`/var/www/nongyu-server` 已按你的要求删除。旧 Admin 静态目录仍在，和新 API 路径不一定兼容。

### 1.3 为什么不让 Node 自己做 HTTPS

可以在 Express 里 `https.createServer({ cert, key })`，但不推荐作为现网方案：

- 证书续期要 reload **Node 进程**（会断连接），Nginx reload 几乎无感。
- 静态站、ACME 挑战、以后多服务共用 443，都更适合放在反向代理。
- Node 只绑回环，即使应用有 bug 也不会把 3000 直接暴露到公网。

这叫 **TLS 终止（TLS termination）**：加密在 Nginx 解开，后面机内是普通 HTTP。

---

## 2. HTTPS / TLS / 证书：学习笔记

### 2.1 HTTP 和 HTTPS 差在哪

|        | HTTP `:80`       | HTTPS `:443`                       |
| ------ | ---------------- | ---------------------------------- |
| 内容   | 明文 HTTP        | HTTP 套在 TLS 里                   |
| 谁能读 | 路径上任何中间人 | 原则上只有客户端和握着私钥的服务器 |
| 地址栏 | `http://`        | `https://`                         |

「SSL」是旧名；现在协议族叫 **TLS**（TLS 1.2 / 1.3）。日常说 SSL 证书，其实是 **X.509 证书 + 私钥**，用来做 TLS。

### 2.2 证书里到底有什么

一张服务器证书至少包含：

1. **公钥**（对应服务器保密的私钥）。
2. **主体替代名 SAN**：这张证「对谁有效」。域名证写 `DNS:api.example.com`；我们这张写 **`IP Address:<公网IP>`**。
3. **有效期** `notBefore` / `notAfter`。
4. **颁发者**：哪家 CA 签的。设备只信任「预置根证书」能验证到的链。

握手时服务器出示证书；客户端检查：

- 链能否验到系统/浏览器根 CA；
- 现在时间是否在有效期内；
- 你访问的主机名或 IP **是否出现在 SAN 里**。

访问 `https://8.x.x.x` 却拿着只写了 `nongyu.app` 的证书，一样会失败。反过来，IP 证书也不能当域名用。

### 2.3 为什么「自己签一张」对 App 很痛

自签证书：你自己当 CA。电脑可以手动信任；**手机系统默认不信任**。RN `fetch` 没有浏览器那种「点高级继续」。所以生产要用 **公众 CA**（Let’s Encrypt、商业 CA）。

### 2.4 公钥基础设施（PKI）一句话

```text
根 CA（预装在 OS / 浏览器）
  └─ 中间 CA（Let’s Encrypt 的 R3 / E5 / YR2 等）
       └─ 你的服务器证书（绑定域名或 IP）
```

Let’s Encrypt 免费，用 **ACME 协议**证明「你控制这台主机」，才肯签名。

### 2.5 ACME 怎么证明「这是你的 IP」

现网用 **HTTP-01**：

```text
1. acme.sh 向 Let’s Encrypt 说：请给 IP A.B.C.D 发证书
2. CA 给一个随机 token
3. acme.sh 把文件放到：
   /var/www/acme/.well-known/acme-challenge/<token>
4. Nginx :80 把
   http://A.B.C.D/.well-known/acme-challenge/<token>
   指到上述目录
5. CA 从公网去 GET 这个 URL，对得上才签发
```

所以：

- **公网 80 必须通**，即使业务已经全走 443；否则续期失败，6 天后 HTTPS 挂掉。
- 校验必须是 **CA 能打到的公网 IP**，和证书 SAN 一致。
- DNS-01（改 TXT 记录）对「纯 IP、没有域名」不适用。

### 2.6 为什么 IP 证书只有约 6 天

Let’s Encrypt 在 2026 年把 **IP 地址证书**做成正式能力，并强制走 **shortlived（短寿）** 档案，大约 **160 小时 / 6 天**。理由：IP 比域名更容易易主，短寿降低「证还有效但 IP 已经不是你的」窗口。

域名证书仍可申请更长周期；**IP 证书不能改成 90 天那种**。因此必须有 **自动续期 + 自动 reload Nginx**，不能靠人手每年点一次。

Let’s Encrypt 还会通过 **ARI**（Renewal Info）告诉客户端「建议哪段时间续」。现网第一次签发后，下次计划续期大约在过期前 3 天。

### 2.7 安全组、firewalld、监听地址，别混

三件事都能让「443 不通」，但不是一层：

| 层                 | 作用                                                                          |
| ------------------ | ----------------------------------------------------------------------------- |
| 云安全组           | 进云主机之前的门。没放行 443 时，本机 `ss` 已 LISTEN，外网仍超时              |
| firewalld/iptables | 主机自己的门。这台机当时 firewalld 没跑                                       |
| `LISTEN_HOST`      | 进程绑在哪张网卡。`0.0.0.0:3000` 全网卡；`127.0.0.1:3000` 只有本机 Nginx 能连 |

本次坑：证书和 Nginx 443 都好了，**安全组没放行 443**，本机 curl HTTPS 超时；放行后立刻通。

3306 对公网开放是历史风险（库文档里写过 `root@%`）。Node 已改连 `127.0.0.1`，但 **MySQL 端口策略不在本次改**，只是提醒：业务库不要长期对全网暴露。

---

## 3. 技术选型（部署层）

| 领域       | 选型                             | 理由                                                                                |
| ---------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| 反代 / TLS | Nginx 1.14（机上已有）           | 不另装 Caddy；TLS 终止 + ACME webroot + 旧静态                                      |
| 进程守护   | systemd `nongyu-node`            | 与 Track 文档一致；开机自启；不把新服务再塞进 PM2                                   |
| 运行文件   | 本机 `tsup` → `dist/index.js`    | 服务器不装完整 TS 工具链；Windows **禁止**拷 `node_modules`（原生模块 ABI/OS 不同） |
| 依赖安装   | 远端 `npm install --omit=dev`    | 包本身不依赖 workspace catalog；在 Linux 上装                                       |
| 证书客户端 | **acme.sh**                      | 系统 Python 3.6 的 pip 最高只到 Certbot 1.23，**没有** `--ip-address` / shortlived  |
| 发布       | `scripts/deploy-nongyu-node.ps1` | 本机构建、scp 打包 `dist`、远端解压、`systemctl restart`                            |
| 认证运维   | SSH 公钥                         | 口令只用于首次装钥；口令勿进 git                                                    |

**明确不选**：Docker（本期一台机、已有 MySQL/Nginx）、PM2（旧栈已在用，新栈脱离）、远端 `tsx watch`（半成品会直接对外）、Let’s Encrypt 90 天域名证（没有域名）。

---

## 4. 现网拓扑与路径

```text
App / Admin / curl
        │
        │  安全组：80、443（3000、3306 不应对公网）
        ▼
   Nginx
   ├─ :443  TLS（IP 证书）→ 反代 /api、/health，静态可仍指旧 Admin
   └─ :80   ACME webroot +（当前仍保留）HTTP 反代，避免 443 未放行时全站死掉
        │
        │  HTTP 127.0.0.1:3000
        ▼
   systemd: node /opt/nongyu-node/dist/index.js
        │
        │  TCP 127.0.0.1:3306
        ▼
   现网 mysqld（库名等见本机数据库连接文档）
```

### 4.1 关键路径一览

| 角色                | 路径                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 应用                | `/opt/nongyu-node/`（`dist/`、`package.json`、`.env`、`node_modules`）                                             |
| systemd             | `/etc/systemd/system/nongyu-node.service`                                                                          |
| Node 二进制         | `/root/.nvm/versions/node/v21.7.3/bin/node`（现网 ExecStart 必须写绝对路径，登录 shell 的 nvm 不会自动进 systemd） |
| Nginx 业务          | `/etc/nginx/conf.d/nongyu-node.conf`（80）、`nongyu-node-ssl.conf`（443）                                          |
| Nginx 主配置        | `/etc/nginx/nginx.conf`（只 `include conf.d`，默认 server 已从主文件挪走）                                         |
| 证书（Nginx 读）    | `/etc/nginx/certs/<公网IP>.fullchain.pem` 与 `.key`                                                                |
| 证书（acme 家目录） | `/root/.acme.sh/<公网IP>/`                                                                                         |
| ACME webroot        | `/var/www/acme/`                                                                                                   |
| 旧 Admin 静态       | `/var/www/nongyu-admin/`                                                                                           |

真实 IP 与 SSH：**本机** `docs/nongyu-node-server/服务器连接信息.md`。

### 4.2 `LISTEN_HOST`

代码：`apps/nongyu-node-server/src/index.ts` 使用 `env.LISTEN_HOST`。

- 本机联调真机：`0.0.0.0`
- 生产：`127.0.0.1`，只让 Nginx 进来

systemd 用 `EnvironmentFile=/opt/nongyu-node/.env` 注入。注意：`tsup` 打成单文件后，dotenv 按源码计算的 `appRoot` 可能指到 `/opt` 而不是 `/opt/nongyu-node`，**生产以 systemd 注入为准**。

### 4.3 `proxy_pass` 尾斜杠（旧坑）

```nginx
# 错：请求 /api/app/auth/login → 上游变成 /app/auth/login（丢了 /api）
location /api {
    proxy_pass http://127.0.0.1:3000/;
}

# 对：原样转到 Node 的 /api/...
location /api {
    proxy_pass http://127.0.0.1:3000;
}
```

新契约是 `/api/app/*`、`/api/admin/*`、`/health`。LLM 流式另开 `location /api/app/llm/`：`proxy_buffering off`、加长 `proxy_read_timeout`，否则 SSE 会被 Nginx 攒包。

---

## 5. 证书签发与续期（现网真实做法）

### 5.1 为什么不是文档初稿里的 Certbot

Let’s Encrypt IP 证书要求 ACME **shortlived** 档案。Certbot 要 **≥ 5.3/5.4** 才有 `--ip-address`。阿里云 CentOS 8 默认 Python 3.6，pip 源里 Certbot 停在 1.23。

改用 **acme.sh**（本机下载 tarball 再上传，因为当时主机 `curl get.acme.sh` 出网失败）。

账户邮箱必须是「带点的域名」形式，`xxx@localhost` 会被 Let’s Encrypt 拒绝。

### 5.2 签发命令（示意，IP 用占位符）

```bash
/root/.acme.sh/acme.sh --issue \
  --cert-profile shortlived \
  -d <公网IP> \
  -w /var/www/acme \
  --keylength 2048
```

安装到 Nginx 可读路径并设置 reload：

```bash
/root/.acme.sh/acme.sh --install-cert -d <公网IP> \
  --fullchain-file /etc/nginx/certs/<公网IP>.fullchain.pem \
  --key-file /etc/nginx/certs/<公网IP>.key \
  --reloadcmd "/usr/sbin/nginx -s reload"
```

私钥不要放在 `nginx` 用户家目录乱拷；现网 key 权限收紧（root 读、reload 由 master 进程完成）。

### 5.3 自动续期链路

```text
crontab（root）
  59 0,6,12,18 * * *  /root/.acme.sh/acme.sh --cron --home /root/.acme.sh

        → 未到 ARI/续期点：什么都不做
        → 到点：再走 HTTP-01 拿新短寿证
        → 写入 Le_RealFullChainPath / Le_RealKeyPath
        → 执行 Le_ReloadCmd（nginx -s reload）
```

首次现网证书大约：签发日 + 6 天过期；配置里的 `Le_NextRenewTimeStr` 落在过期前约 3 天。

**续期失败最常见原因**：安全组关掉 80、Nginx 去掉了 `/.well-known/acme-challenge/`、磁盘满、系统时间错。

手工检查：

```bash
crontab -l
openssl x509 -in /etc/nginx/certs/<公网IP>.fullchain.pem -noout -dates -ext subjectAltName
/root/.acme.sh/acme.sh --cron --home /root/.acme.sh --force   # 慎用 force，会消耗额度
```

---

## 6. 进程与发布

### 6.1 为什么换掉 PM2

旧 `nongyu-server` 用 PM2 守护，且挂在一个 abandoned 的 SSH session scope 上，靠 PM2 God Daemon 续命。新栈用 systemd：

- `Restart=on-failure`
- `systemctl enable` 与开机绑定清晰
- 与「本机上传 dist + restart」脚本好接

停旧服务：`pm2 delete nongyu-server && pm2 save --force`，避免重启后又把旧进程拉起来抢 3000。

### 6.2 日常发布（开发改代码后）

本机：

```powershell
powershell -File scripts/deploy-nongyu-node.ps1
```

流程：`pnpm --filter nongyu-node-server build` → 打包 `dist` → scp → 远端解压到 `/opt/nongyu-node/dist` → `systemctl restart nongyu-node`。

依赖变更加 `-InstallDeps`（远端再 `npm install --omit=dev`）。

**不要**从 Windows 同步 `node_modules`。**不要**用发布脚本覆盖服务器 `.env`。

### 6.3 迁移

改表结构才在服务器对现网库跑 migrate，且需先备份；日常发版默认不 migrate。

---

## 7. 首次装机实际做了什么（时间线，供对照）

1. 从本机数据库连接文档读取主机；SSH 口令仅用于写入 gitignore 的 env，并 **安装 ed25519 公钥**。
2. 探活：发现旧 PM2 + Nginx 80 + MySQL；无 443、无可用新 Certbot。
3. 本机 `tsup` 出 `dist`，上传 `/opt/nongyu-node`，远端 npm 装依赖。
4. 写入 systemd，注入生产 `.env`（`LISTEN_HOST=127.0.0.1`，`MYSQL_HOST=127.0.0.1`）。
5. 停 PM2 旧 API；新进程 `/health` 且 `db=up`。
6. 整理 Nginx：去掉主配置里重复的 default_server；`/api` 不再剥前缀；增加 `/health` 与 LLM 流式 location。
7. acme.sh 签发 IP 短寿证；443 配置好后外网仍超时 → **补安全组 443** 后公网 HTTPS 通。
8. 443 未通前曾把 80 改成 301 到 HTTPS，导致公网业务全死；已改回 **80 继续反代**，443 并行。若你确认只走 HTTPS，可再把 80 收成「仅 ACME + 跳转」。

---

## 8. 客户端怎么配

| 端         | 变量 / 配置                | 值                          |
| ---------- | -------------------------- | --------------------------- |
| RN         | `EXPO_PUBLIC_API_BASE_URL` | `https://<公网IP>` 无尾斜杠 |
| Admin 开发 | API origin                 | 同上                        |
| 探活       | GET                        | `https://<公网IP>/health`   |

HTTP 目前仍可用，但新客户端应优先 HTTPS。证书 SAN 是 IP，Base URL 必须是 IP，不能写成某个未写进证书的域名。

---

## 9. 安全与卫生

- 口令、私钥、生产 `.env` **禁止提交**；仓库只有 `*.example`。
- 聊天里出现过的 SSH 口令应视为泄露，在云控制台轮换；之后只用密钥。
- 生产 `JWT_SECRET` / `LLM_KEY_ENCRYPTION_SECRET` 若与开发共用同一 MySQL，改密钥会导致旧 Token 失效、库里已加密的 LLM Key 解不开。本次为对齐已有库数据沿用了开发机同套密钥——**长期应轮换并做数据迁移**，不要当成最佳实践。
- `CORS_ORIGIN=*` 是过渡；管理端若改独立域名再收紧。
- 超管默认密码不要长期与 SSH 等复用。

---

## 10. 故障对照

| 现象                                    | 先查                                                                  |
| --------------------------------------- | --------------------------------------------------------------------- |
| 公网 HTTPS 超时，服务器 `ss` 已有 443   | 云安全组                                                              |
| HTTPS 证书警告 / RN 网络失败            | SAN 是否为该 IP；是否过期；是否用了 http 客户端去打 https             |
| `/health` 变成管理端 HTML               | `location /health` 是否在 `location /` 之前；Host 是否打到对的 server |
| `/api/app/...` 404 但 Node 日志路径不对 | `proxy_pass` 是否多了尾斜杠                                           |
| 续期后浏览器仍报过期                    | 是否执行了 reload；Nginx 是否仍指向旧文件路径                         |
| Node 起不来 Invalid environment         | systemd `EnvironmentFile` 是否指向 `/opt/nongyu-node/.env`            |
| 重启后又出现旧 API                      | PM2 是否又把 `nongyu-server` 拉起来                                   |

---

## 11. 仓库内相关文件

| 路径                                        | 说明                                |
| ------------------------------------------- | ----------------------------------- |
| `docs/nongyu-node-server/部署与发布.md`     | 短操作约定                          |
| `docs/nongyu-node-server/deploy/*.example`  | Nginx / systemd 样例（IP 用占位符） |
| `scripts/deploy-nongyu-node.ps1`            | 日常发布                            |
| `scripts/node-deploy.env.example`           | 复制到 `scripts/ops/`               |
| `apps/nongyu-node-server/src/config/env.ts` | `LISTEN_HOST` 等                    |

`scripts/ops/` 整目录 gitignore，里面的现网 conf / 临时装机脚本 **不是**文档真相源；以本文 + `部署与发布.md` 为准。

---

## 12. 延伸阅读（官方，便于你深挖）

- TLS 握手与证书：MDN「Transport Layer Security」
- Let’s Encrypt：IP 证书与 shortlived（2026-01 GA）、ARI
- Nginx `proxy_pass`：官方文档「proxy_pass 带/不带 URI」
- ACME HTTP-01：RFC 8555

---

## 13. 变更记录

| 日期       | 说明                                                  |
| ---------- | ----------------------------------------------------- |
| 2026-08-16 | 初稿：同机部署实况 + HTTPS/证书/ACME/安全组学习向说明 |

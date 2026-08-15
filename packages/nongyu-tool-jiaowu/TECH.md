# 技术设计文档

### 技术栈

- 处理编码（iconv-lite）
- 存储二进制（buffer）
- 网络请求（axios）

### 架构设计

- 网络层
  基于axios封装request函数，再基于此封装get和post函数对外暴露，对于request，使用请求拦截器添加cookie，对于响应，使用响应拦截器做 GBK 解码。业务页若响应体包含“登录超时”则自动重新登录并重放一次；网络错误最多重试 3 次。`check.asp` 同样解码，但不走超时自动重登（避免与 `jiaowuLogin` 循环）。登录链路见下方「已验证登录」；拦截器不覆盖登录已带的 User-Agent。
  对于get请求最终fetchJiaowuHtml函数，用于获取教务系统页面的HTML内容
- 解析层
  使用packages\nongyu-tool-jiaowu\core\extractor目录下的文件，用于从原始HTML中清洗出结构化数据
- 直接导出层
  整合网络层和解析层，提供直接导出数据的功能
  最终分别放在packages\nongyu-tool-jiaowu\core\jiaowu再统一导出

### 已验证登录（2026-08-14 真机调通）

完整经验与否决项见 `docs/nongyu-rn-app/tech/教务鉴权方案.md` §8。包内实现：`core/login/index.ts` 的 `jiaowuLogin`。

1. 清空内存 Cookie。
2. GET `https://jiaowu.sicau.edu.cn/web/web/web/index.asp`，从 hidden 解析 `sign` / `hour_key`，从 `Set-Cookie` 取 `ASPSESSIONID*`（有则写入；禁止写空 Cookie 头）。
3. POST `https://jiaowu.sicau.edu.cn/jiaoshi/bangong/check.asp`，Referer 为登录页；body 顺序：`user`、`pwd`、`lb=S`、`submit=`、`sign`、`hour_key`。
4. 先 GBK 解码再判定：`alert` 为失败（透出原文）；302 或 `location` 跳转为成功。HTTP 200 不等于成功。

禁止冻抓包里的 Cookie / sign / hour_key。解析失败不得回退固定值。RN 加载 `dist/`，改源码后必须 `pnpm --filter nongyu-tool-jiaowu build`。

/**
 * 生成微信公众号可粘贴的内联 HTML 预览页（含 base64 配图 + 一键复制）
 * 用法：在本目录执行 node generate.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imgDir = path.join(__dirname, "images-compressed");

function imgDataUri(filename) {
  const buf = fs.readFileSync(path.join(imgDir, filename));
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

const imgs = {
  home: imgDataUri("01-home.jpg"),
  jiaowu: imgDataUri("02-jiaowu.jpg"),
  course1: imgDataUri("03-course1.jpg"),
  course2: imgDataUri("04-course2.jpg"),
  course3: imgDataUri("05-course3.jpg"),
  course4: imgDataUri("06-course4.jpg"),
  course5: imgDataUri("07-course5.jpg"),
  second1: imgDataUri("08-second1.jpg"),
  second2: imgDataUri("09-second2.jpg"),
  second3: imgDataUri("10-second3.jpg"),
  agent1: imgDataUri("11-agent1.jpg"),
  agent2: imgDataUri("12-agent2.jpg"),
  plaza: imgDataUri("13-plaza.jpg"),
};

const BRAND = "#0A7C59";
const BRAND_MUTED = "#D4E9DF";
const TEXT = "#0F1A14";
const TEXT2 = "#4A564F";
const BG = "#F7FAF8";
const SURFACE = "#FFFFFF";
const LINE = "#CFE3DA";

function p(html) {
  return `<p style="margin:0 0 14px;padding:0;font-size:15px;line-height:1.85;letter-spacing:0.3px;color:${TEXT};text-align:justify;">${html}</p>`;
}

function tip(html) {
  return `<p style="margin:0 0 14px;padding:0;font-size:14px;line-height:1.75;color:${TEXT2};text-align:center;">${html}</p>`;
}

function h2(num, title) {
  return `<section style="margin:28px 0 12px;padding:0;">
  <p style="margin:0 0 6px;padding:0;font-size:12px;line-height:1.4;letter-spacing:2px;color:${BRAND};font-weight:600;">${num}</p>
  <h2 style="margin:0;padding:0 0 10px;border-bottom:2px solid ${BRAND};font-size:18px;line-height:1.4;font-weight:700;color:${TEXT};">${title}</h2>
</section>`;
}

function point(label, text) {
  return `<section style="margin:0 0 12px;padding:12px 14px;background:${BG};border-left:3px solid ${BRAND};border-radius:0 8px 8px 0;">
  <p style="margin:0 0 4px;padding:0;font-size:15px;line-height:1.5;font-weight:700;color:${TEXT};">${label}</p>
  <p style="margin:0;padding:0;font-size:14px;line-height:1.7;color:${TEXT2};">${text}</p>
</section>`;
}

function shot(src, alt) {
  return `<p style="margin:8px 0 18px;padding:0;text-align:center;">
  <img src="${src}" alt="${alt}" style="display:block;margin:0 auto;max-width:100%;width:280px;border:0;border-radius:16px;box-shadow:0 8px 24px rgba(15,26,20,0.12);" />
</p>`;
}

function divider() {
  return `<p style="margin:22px 0;padding:0;text-align:center;font-size:12px;letter-spacing:6px;color:${LINE};">···</p>`;
}

const articleBody = `
<section style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;color:${TEXT};background:${SURFACE};">

${tip(`<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${BRAND_MUTED};color:${BRAND};font-size:12px;font-weight:600;letter-spacing:1px;">川农专属 · 校园智慧助手</span>`)}

<h1 style="margin:8px 0 10px;padding:0;font-size:34px;line-height:1.25;font-weight:700;text-align:center;color:${BRAND};letter-spacing:4px;">农屿</h1>

${tip("专属川农er的智慧校园助手")}

${p("农屿聚合了川农教务信息查询、二课信息查询，并提供无广告、快启动、高颜值、多功能的课表模块。最新版本推出农屿 AI——二课活动推荐、各类资讯查询、广场帖子搜索，农屿 AI 都能搞定。")}

${p(`<strong style="color:${BRAND};">你想要的，农屿都能做到。</strong>`)}

${divider()}

${h2("01", "认识农屿")}
${p("下图是农屿的首页，提供了教务系统和二课系统的集成入口，同时你还可以在农屿便捷跳转各类川农常用网站。")}
${shot(imgs.home, "农屿首页")}

${h2("02", "教务功能")}
${p("有了农屿，你关心的教务数据就无需每次都登录教务网查询，也无需查询川农微教务。农屿集成了常用的各类教务信息，点击即可快速查看。")}
${shot(imgs.jiaowu, "教务功能")}

${h2("03", "课表功能")}
${p("你一定也曾为「超级课程表」这类商业化 App 苦恼吧：想看下午上哪节课，扑面而来的却是开屏广告，稍不留神还可能跳到别的应用。")}
${p("为此，农屿重点打造了无广告、启动快的课表——除了基础查询，还贴心准备了这些能力：")}
${point("课程考勤记录", "哪节课签过到、哪节课翘了，记得一清二楚。")}
${shot(imgs.course1, "课程考勤")}
${point("课程备忘录", "小组作业哪天交？直接记在课表上。")}
${shot(imgs.course2, "课程备忘录")}
${point("课程待办事项", "结课报告下周必须做完……通通收进待办。")}
${shot(imgs.course3, "课程待办")}
${point("好友课表差异", "想知道和朋友的课表差在哪？输入对方学号，一眼对比。")}
${shot(imgs.course4, "好友课表差异")}
${point("自定义日程", "课表之外还能添加日程卡片；若与课程重叠，长按即可翻转查看。")}
${shot(imgs.course5, "自定义日程")}

${h2("04", "二课功能")}
${p("想看二课成绩，又不想打开 i 川农？农屿也能看。二课分数、排名、附加分记录…… i 川农有的，农屿都有。使用前需在农屿内登录一次 i 川农系统。")}
${shot(imgs.second1, "二课功能 1")}
${shot(imgs.second2, "二课功能 2")}
${shot(imgs.second3, "二课功能 3")}

${h2("05", "Agent 功能")}
${p("全民 AI 的时代，农屿也跟上了节奏。最新版本推出农屿 AI：很多操作它能帮你做，很多问题它也答得上。")}
${p("例如你问「根据我的二课分数现状给我推荐二课活动」，它会看出哪一块分数偏低，再帮你搜对应方向的活动。")}
${point("能帮你做", "切换设置、搜索帖子、查看信息等常用操作，一句话交代即可。")}
${point("能帮你想", "结合你的二课分数等现状，给出更贴合的活动推荐与查询。")}
${point("还能继续挖", "更多有趣能力等你自己探索，欢迎上手体验。")}
${shot(imgs.agent1, "农屿 AI 1")}
${shot(imgs.agent2, "农屿 AI 2")}
${p("建议重度用户自行配置大模型 API Key，否则排队可能让人崩溃——开发者亲自试过。重度使用农屿 AI，其实一点也不贵。")}

${h2("06", "广场功能")}
${p("新版本农屿终于开放广场啦。广场由三个部分组成：")}
${point("公告栏", "官方消息与通知，来这里看就对了。")}
${point("反馈墙", "想对农屿说的话都可以写在这里，我们会尽可能跟进解决。")}
${point("农家大院", "欢迎来大院唠嗑，聊聊校园日常。")}
${shot(imgs.plaza, "广场")}

${h2("07", "获取农屿")}
${p(`官网：<a href="https://nongyu.site" style="color:${BRAND};text-decoration:none;">https://nongyu.site</a>`)}
${p("<strong>Android</strong>：官网提供 APK 下载，按系统提示安装（可能需允许未知来源）。")}
${p("<strong>iOS</strong>：通过 Apple TestFlight 安装测试版（暂未上架 App Store）。")}
${p("具体下载入口以官网「获取农屿」区块为准。")}

${h2("08", "联系团队")}
${p(`微信公众号：<strong style="color:${BRAND};">农屿校园助手</strong>`)}
${p("QQ 群：<strong>327303003</strong>")}
${p("关注公众号或加入 QQ 群，获取通知与反馈通道。")}

${h2("09", "农屿团队介绍")}
${p("目前，农屿团队的主要成员只有三名，都是信息工程学院的在读学生。为了建设更好用的校园软件生态，我们期待有更多有着相同愿景的小伙伴加入——无论学院、专业、年级，只要你感兴趣，农屿都欢迎你。我们一起为爱发电，免费给川农学子提供好用的校园软件！")}
${p("有意愿加入的同学，可进入农屿官方 QQ 群联系管理员。")}

${divider()}

${tip("农屿工作室")}
${tip("© 农屿 · 川农校园助手")}

</section>
`.trim();

const articleEscaped = JSON.stringify(articleBody);

const previewHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>农屿公众号推文 · 预览与复制</title>
  <style>
    :root {
      --brand: ${BRAND};
      --bg: #eef3f0;
      --ink: ${TEXT};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "DM Sans", "Noto Sans SC", system-ui, sans-serif;
      background: radial-gradient(circle at top, #e4f3eb, var(--bg) 45%);
      color: var(--ink);
      min-height: 100vh;
    }
    .bar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      background: rgba(247, 250, 248, 0.92);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid ${LINE};
    }
    .bar h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 650;
    }
    .bar p {
      margin: 4px 0 0;
      font-size: 12px;
      color: ${TEXT2};
      max-width: 48rem;
      line-height: 1.5;
    }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    button {
      border: 0;
      border-radius: 999px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .primary { background: var(--brand); color: #fff; }
    .ghost { background: #fff; color: var(--brand); border: 1px solid ${LINE}; }
    .toast {
      position: fixed;
      left: 50%;
      bottom: 28px;
      transform: translateX(-50%) translateY(20px);
      opacity: 0;
      pointer-events: none;
      background: #123528;
      color: #fff;
      padding: 10px 16px;
      border-radius: 999px;
      font-size: 13px;
      transition: .25s ease;
    }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    .stage {
      display: flex;
      justify-content: center;
      padding: 28px 16px 64px;
    }
    .phone {
      width: min(420px, 100%);
      background: #111;
      border-radius: 28px;
      padding: 14px 10px 18px;
      box-shadow: 0 24px 60px rgba(15, 26, 20, 0.2);
    }
    .notch {
      width: 96px;
      height: 8px;
      margin: 0 auto 12px;
      border-radius: 999px;
      background: #2a2a2a;
    }
    .screen {
      background: #fff;
      border-radius: 18px;
      overflow: hidden;
      max-height: 78vh;
      overflow-y: auto;
    }
    .meta {
      padding: 16px 18px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .meta .title {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.35;
    }
    .meta .sub {
      margin: 0 0 14px;
      font-size: 12px;
      color: #888;
    }
    #article {
      padding: 8px 16px 28px;
    }
  </style>
</head>
<body>
  <div class="bar">
    <div>
      <h1>农屿公众号推文 · 直出预览</h1>
      <p>
        点「一键复制正文」→ 打开
        <a href="https://mp.weixin.qq.com" target="_blank" rel="noreferrer">mp.weixin.qq.com</a>
        → 新建图文 → 粘贴到正文。图片会随 HTML 一起进入编辑器（由微信转存）。封面请另选
        <code>images-compressed/01-home.jpg</code>。
      </p>
    </div>
    <div class="actions">
      <button class="primary" type="button" id="copyBtn">一键复制正文</button>
      <button class="ghost" type="button" id="openMp">打开公众号后台</button>
    </div>
  </div>

  <div class="stage">
    <div class="phone">
      <div class="notch"></div>
      <div class="screen">
        <div class="meta">
          <p class="title">农屿上线｜专属川农er的校园助手</p>
          <p class="sub">农屿工作室 · 预览效果（与正式发布接近）</p>
        </div>
        <div id="article"></div>
      </div>
    </div>
  </div>

  <div class="toast" id="toast" role="status"></div>

  <script>
    const ARTICLE_HTML = ${articleEscaped};
    const articleEl = document.getElementById("article");
    articleEl.innerHTML = ARTICLE_HTML;

    const toast = document.getElementById("toast");
    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2200);
    }

    async function copyArticle() {
      const html = ARTICLE_HTML;
      const plain = articleEl.innerText;
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([plain], { type: "text/plain" }),
            }),
          ]);
          showToast("已复制，去公众号后台粘贴即可");
          return;
        }
      } catch (_) {}

      // 兜底：选中正文后 document.execCommand('copy')
      const range = document.createRange();
      range.selectNodeContents(articleEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      const ok = document.execCommand("copy");
      sel.removeAllRanges();
      showToast(ok ? "已复制（兼容模式）" : "复制失败，请手动选中正文复制");
    }

    document.getElementById("copyBtn").addEventListener("click", () => {
      void copyArticle();
    });
    document.getElementById("openMp").addEventListener("click", () => {
      window.open("https://mp.weixin.qq.com", "_blank", "noopener,noreferrer");
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, "preview.html"), previewHtml, "utf8");

// 纯正文片段，便于高级用户手动处理
fs.writeFileSync(path.join(__dirname, "article-body.html"), articleBody, "utf8");

const sizeMb = (fs.statSync(path.join(__dirname, "preview.html")).size / 1024 / 1024).toFixed(2);
console.log(`wrote preview.html (${sizeMb} MB) and article-body.html`);

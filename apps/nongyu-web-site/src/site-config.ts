/**
 * 官网可配置内容（下载链接、联系、功能块）
 * Android URL 为空时下载按钮为「即将开放」
 * 功能正文为占位文案，产品方可直接改 description / points
 */
export type FeaturePoint = {
  label: string;
  text: string;
};

export type FeatureItem = {
  id: string;
  title: string;
  description: string;
  /** 可选要点列表；有则渲染为编号清单 */
  points?: FeaturePoint[];
  /** 要点后的补充说明 */
  closing?: string;
  /** public/features 下 webp 路径（由 prebuild 从 assets/feature-screens 生成）；长度 >1 时启用轮播 */
  images: string[];
};

export const siteConfig = {
  brand: "农屿",
  studio: "农屿工作室",
  tagline: "专属川农er的校园助手",
  lead: "无广告课表、教务与二课聚合、农屿 AI，你想要的，农屿都能做到",
  /** 空字符串 = 未就绪；同源静态 APK 见 public/downloads/ */
  downloadAndroidUrl: "/downloads/nongyu-android.apk",
  downloadIosUrl: "https://testflight.apple.com/join/2ujaeZYy",
  contact: {
    wechatName: "农屿校园助手",
    qqGroup: "327303003",
  },
  /** 团队介绍正文占位，产品方直接改 body */
  team: {
    title: "农屿团队介绍",
    body: "目前，农屿团队的主要成员只有三名，都是信息工程学院的在读学生。为了建设更好用的校园软件生态，我们期待有更多有着相同愿景的小伙伴加入——无论学院、专业、年级，只要你感兴趣，农屿都欢迎你。我们一起为爱发电，免费给川农学子提供好用的校园软件！\n\n有意愿加入的同学，可进入农屿官方 QQ 群联系管理员。",
  },
  features: [
    {
      id: "intro",
      title: "认识农屿",
      description:
        "下图是农屿的首页，提供了教务系统和二课系统的集成入口，同时你还可以在农屿便捷跳转各类川农常用网站",
      images: ["features/home.webp"],
    },
    {
      id: "jiaowu",
      title: "教务功能",
      description:
        "有了农屿，你关心的教务数据就无需每次都登录教务网查询，也无需查询川农微教务，农屿集成了常用的各类教务信息，点击即可快速查看",
      images: ["features/jiaowu1.webp"],
    },
    {
      id: "course",
      title: "课表功能",
      description:
        "你一定也曾为「超级课程表」这类商业化 App 苦恼吧：想看下午上哪节课，扑面而来的却是开屏广告，稍不留神还可能跳到别的应用。为此，农屿重点打造了无广告、启动快的课表——除了基础查询，还贴心准备了这些能力：",
      points: [
        {
          label: "课程考勤记录",
          text: "哪节课签过到、哪节课翘了，记得一清二楚。",
        },
        {
          label: "课程备忘录",
          text: "小组作业哪天交？直接记在课表上。",
        },
        {
          label: "课程待办事项",
          text: "结课报告下周必须做完……通通收进待办。",
        },
        {
          label: "好友课表差异",
          text: "想知道和朋友的课表差在哪？输入对方学号，一眼对比。",
        },
        {
          label: "自定义日程",
          text: "课表之外还能添加日程卡片；若与课程重叠，长按即可翻转查看。",
        },
      ],
      images: [
        "features/course1.webp",
        "features/course2.webp",
        "features/course3.webp",
        "features/course4.webp",
        "features/course5.webp",
      ],
    },
    {
      id: "second",
      title: "二课功能",
      description:
        "想看二课成绩，又不想打开 i 川农？农屿也能看。二课分数、排名、附加分记录…… i 川农有的，农屿都有。使用前需在农屿内登录一次 i 川农系统。",
      images: ["features/second1.webp", "features/second2.webp", "features/second3.webp"],
    },
    {
      id: "agent",
      title: "Agent 功能",
      description:
        "全民 AI 的时代，农屿也跟上了节奏。最新版本推出农屿 AI：很多操作它能帮你做，很多问题它也答得上。例如你问「根据我的二课分数现状给我推荐二课活动」，它会看出哪一块分数偏低，再帮你搜对应方向的活动。",
      points: [
        {
          label: "能帮你做",
          text: "切换设置、搜索帖子、查看信息等常用操作，一句话交代即可。",
        },
        {
          label: "能帮你想",
          text: "结合你的二课分数等现状，给出更贴合的活动推荐与查询。",
        },
        {
          label: "还能继续挖",
          text: "更多有趣能力等你自己探索，欢迎上手体验。",
        },
      ],
      closing:
        "建议重度用户自行配置大模型 API Key，否则排队可能让人崩溃——开发者亲自试过。重度使用农屿 AI，其实一点也不贵。",
      images: ["features/agent1.webp", "features/agent2.webp"],
    },
    {
      id: "plaza",
      title: "广场功能",
      description: "新版本农屿终于开放广场啦。广场由三个部分组成：",
      points: [
        {
          label: "公告栏",
          text: "官方消息与通知，来这里看就对了。",
        },
        {
          label: "反馈墙",
          text: "想对农屿说的话都可以写在这里，我们会尽可能跟进解决。",
        },
        {
          label: "农家大院",
          text: "欢迎来大院唠嗑，聊聊校园日常。",
        },
      ],
      images: ["features/center.webp"],
    },
  ] satisfies FeatureItem[],
} as const;

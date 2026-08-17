/**
 * 官网可配置内容（下载链接、联系、功能块）
 * Android URL 为空时下载按钮为「即将开放」
 */
export type FeatureItem = {
  id: string;
  title: string;
  description: string;
  /** public 下相对路径，如 features/01-course.gif */
  gifSrc: string;
};

export const siteConfig = {
  brand: "农屿",
  studio: "农屿工作室",
  tagline: "专属川农er的校园助手",
  lead: "无广告课表、教务与二课聚合、农屿 AI，你想要的，农屿都能做到",
  /** 空字符串 = 未就绪 */
  downloadAndroidUrl: "",
  downloadIosUrl: "",
  contact: {
    wechatName: "农屿校园助手",
    qqGroup: "327303003",
  },
  features: [
    {
      id: "course",
      title: "智能课表",
      description: "周视图课表、自定义日程、同学间共享与差异对比，支持桌面小组件",
      gifSrc: "features/01-course.gif",
    },
    {
      id: "jiaowu",
      title: "教务聚合",
      description: "教务通知、成绩、专业排名、考试安排、培养方案等常用查询一站到达",
      gifSrc: "features/02-jiaowu.gif",
    },
    {
      id: "second",
      title: "二课查询",
      description: "浏览二课活动与个人学分、综测信息；本版为只读查询，不含报名",
      gifSrc: "features/03-second.gif",
    },
    {
      id: "ai",
      title: "农屿 AI",
      description: "用自然语言查询教务、二课、课表与广场；教师/教室课表也可问 AI",
      gifSrc: "features/04-ai.gif",
    },
    {
      id: "plaza",
      title: "校园广场",
      description: "官方公告、反馈墙与大院，获取通知并参与反馈",
      gifSrc: "features/05-plaza.gif",
    },
    {
      id: "theme",
      title: "主题与个性化",
      description: "川农新绿等外观与课表偏好，让日常打开更顺手",
      gifSrc: "features/06-theme.gif",
    },
  ] satisfies FeatureItem[],
} as const;

export type WebNavItem = {
  text: string;
  url: string;
};

/** 常用网站（完整迁移自旧版 WebNav） */
const list1: WebNavItem[] = [
  { text: "川农官网", url: "https://www.sicau.edu.cn/index.jsp" },
  { text: "教务网", url: "https://jiaowu.sicau.edu.cn/web/web/web/index.asp" },
  { text: "学工系统", url: "https://xgxt.sicau.edu.cn/sys/SystemForm/main.htm" },
  { text: "后勤官网", url: "https://hqfw.sicau.edu.cn/" },
  { text: "校车官网", url: "https://busticket.sicau.edu.cn/" },
  { text: "川农图书馆", url: "https://lib.sicau.edu.cn/LibSicau/" },
  { text: "四六级报名", url: "https://cet.neea.edu.cn/" },
  { text: "计算机等级", url: "https://ncre.neea.edu.cn/" },
];

const list2: WebNavItem[] = [
  { text: "信息工程学院", url: "https://xxgc.sicau.edu.cn/" },
  { text: "资源学院", url: "https://zyxy.sicau.edu.cn/" },
  { text: "园艺学院", url: "https://yyx.sicau.edu.cn/" },
  { text: "艺术传媒学院", url: "https://yscm.sicau.edu.cn/" },
  { text: "土木工程学院", url: "https://tmgcxy.sicau.edu.cn/" },
  { text: "体育学院", url: "https://ytxy.sicau.edu.cn/" },
  { text: "水利水电学院", url: "https://slsd.sicau.edu.cn/" },
  { text: "食品学院", url: "https://spxy.sicau.edu.cn/" },
];

const list3: WebNavItem[] = [
  { text: "生命科学", url: "https://smkx.sicau.edu.cn/" },
  { text: "商旅学院", url: "https://slxy.sicau.edu.cn/" },
  { text: "人文学院", url: "https://rwy.sicau.edu.cn/" },
  { text: "农学院", url: "https://nxy.sicau.edu.cn/" },
  { text: "林学院", url: "https://lxy.sicau.edu.cn/" },
  { text: "理学院", url: "https://lixueyuan.sicau.edu.cn/" },
  { text: "经济学院", url: "https://jjxy.sicau.edu.cn/" },
  { text: "机电学院", url: "https://jdxy.sicau.edu.cn/" },
];

const list4: WebNavItem[] = [
  { text: "建筑城乡学院", url: "https://jg.sicau.edu.cn/" },
  { text: "环境学院", url: "https://hjxy.sicau.edu.cn/" },
  { text: "管理学院", url: "https://glxy.sicau.edu.cn/" },
  { text: "公共管理学院", url: "https://fpa.sicau.edu.cn/" },
  { text: "风景园林学院", url: "https://fjylxy.sicau.edu.cn/" },
  { text: "法学院", url: "https://fxy.sicau.edu.cn/" },
  { text: "动物医学学院", url: "https://dyy.sicau.edu.cn/" },
  { text: "草业科技学院", url: "https://cgst.sicau.edu.cn/index.jsp" },
];

export const WEB_NAV_ITEMS: WebNavItem[] = [...list1, ...list2, ...list3, ...list4];

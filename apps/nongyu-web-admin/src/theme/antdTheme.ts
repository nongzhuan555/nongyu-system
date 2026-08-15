import type { ThemeConfig } from "antd";

/** 管理端 Ant Design Token，色值只来自 design-system MASTER。 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#10B981",
    borderRadius: 16,
    colorText: "#1E293B",
    colorTextSecondary: "#64748B",
    colorBgLayout: "#F8FAFC",
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  },
  components: {
    Button: {
      controlHeight: 48,
      borderRadius: 16,
    },
    Input: {
      controlHeight: 48,
      borderRadius: 16,
    },
    Menu: {
      itemBorderRadius: 12,
      itemSelectedBg: "#D1FAE5",
      itemSelectedColor: "#059669",
    },
  },
};

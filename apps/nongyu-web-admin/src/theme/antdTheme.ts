import type { ThemeConfig } from "antd";

/** 管理端 Ant Design Token，色值对齐 RN 川农新绿 + design-system/web-admin MASTER。 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#0A7C59",
    colorInfo: "#0A7C59",
    colorSuccess: "#0A7C59",
    colorWarning: "#B45309",
    colorError: "#C62828",
    borderRadius: 12,
    colorText: "#1F2937",
    colorTextSecondary: "#424945",
    colorBgLayout: "#FAFBFA",
    colorBgContainer: "#FFFFFF",
    colorBorder: "#CFE3DA",
    colorBorderSecondary: "#DEE5E1",
    controlHeight: 40,
    fontFamily: '"Source Sans 3", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    fontSize: 14,
  },
  components: {
    Button: {
      controlHeight: 40,
      borderRadius: 12,
      primaryShadow: "0 1px 2px rgba(10, 124, 89, 0.18)",
    },
    Input: {
      controlHeight: 40,
      borderRadius: 12,
    },
    Select: {
      controlHeight: 40,
      borderRadius: 12,
    },
    Menu: {
      itemBorderRadius: 10,
      itemMarginInline: 8,
      itemHeight: 40,
      itemSelectedBg: "#D4E9DF",
      itemSelectedColor: "#0A7C59",
      itemHoverBg: "rgba(10, 124, 89, 0.06)",
      iconSize: 16,
    },
    Table: {
      headerBg: "#F3F6F4",
      headerColor: "#424945",
      rowHoverBg: "rgba(212, 233, 223, 0.45)",
      borderColor: "#DEE5E1",
    },
    Tabs: {
      titleFontSize: 14,
      horizontalItemGutter: 24,
      inkBarColor: "#0A7C59",
      itemSelectedColor: "#0A7C59",
      itemHoverColor: "#0A7C59",
    },
    Card: {
      borderRadiusLG: 16,
    },
  },
};

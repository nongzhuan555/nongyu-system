import { FontAwesome, Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { toast } from "@/components/ui/toast";
import { HomeSurface } from "@/modules/home/components/HomeSurface";
import { SOCIAL_COPY } from "@/modules/home/constants/social";
import { lightTokens } from "@/theme/tokens";

type CopyRow = {
  key: string;
  title: string;
  value: string;
  copyLabel: string;
  /** 行首品牌图标（微信用 Ionicons，QQ 用 FontAwesome 企鹅） */
  renderIcon: () => ReactNode;
};

const ICON_SIZE = 17;
const ICON_COLOR = lightTokens.color.brand;

const ROWS: CopyRow[] = [
  {
    key: "wechat",
    title: `公众号 · ${SOCIAL_COPY.wechatName}`,
    value: SOCIAL_COPY.wechatName,
    copyLabel: "公众号",
    renderIcon: () => <Ionicons name="logo-wechat" size={ICON_SIZE} color={ICON_COLOR} />,
  },
  {
    key: "qq",
    title: `QQ 群 · ${SOCIAL_COPY.qqGroup}`,
    value: SOCIAL_COPY.qqGroup,
    copyLabel: "QQ群号",
    // FontAwesome Brands 的 qq = 经典企鹅标（Ionicons 无此字形）
    renderIcon: () => <FontAwesome name="qq" size={ICON_SIZE} color={ICON_COLOR} />,
  },
];

type SocialCopyCardProps = {
  /**
   * 与悬浮底栏重叠时由首页传入的降透值（1=正常，越接近底栏越低）
   * 用于减少「卡片压在毛玻璃底栏上」的杂乱感
   */
  opacity?: number;
};

/**
 * 公众号 / QQ 复制卡片
 */
export function SocialCopyCard({ opacity = 1 }: SocialCopyCardProps) {
  const copyText = async (value: string, copyLabel: string) => {
    await Clipboard.setStringAsync(value);
    toast.success(`${copyLabel}已复制`);
  };

  return (
    <HomeSurface style={[styles.card, { opacity }]}>
      {ROWS.map((row, index) => (
        <Pressable
          key={row.key}
          accessibilityRole="button"
          accessibilityLabel={`复制${row.copyLabel}`}
          style={({ pressed }) => [
            styles.row,
            index > 0 && styles.rowBorder,
            pressed && styles.pressed,
          ]}
          onPress={() => copyText(row.value, row.copyLabel)}
        >
          <View style={styles.iconBox}>{row.renderIcon()}</View>
          <Text style={styles.label} numberOfLines={1}>
            {row.title}
          </Text>
          <View style={styles.hintPill}>
            <Text style={styles.hint}>复制</Text>
          </View>
        </Pressable>
      ))}
    </HomeSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: lightTokens.space.md,
    marginBottom: lightTokens.space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(10, 124, 89, 0.1)",
  },
  pressed: {
    opacity: 0.72,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTokens.color.brandMuted,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: lightTokens.color.text,
  },
  hintPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: lightTokens.color.brandMuted,
  },
  hint: {
    fontSize: 11,
    fontWeight: "600",
    color: lightTokens.color.brand,
  },
});

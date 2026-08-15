import { FontAwesome, Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { toast } from "@/components/ui/toast";
import { HomeSurface } from "@/modules/home/components/HomeSurface";
import { SOCIAL_COPY } from "@/modules/home/constants/social";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useThemeTokens } from "@/theme/ThemeProvider";

const ICON_SIZE = 17;

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
  const styles = useStyles();
  const t = useThemeTokens();
  const brand = t.color.brand;

  const copyText = async (value: string, copyLabel: string) => {
    await Clipboard.setStringAsync(value);
    toast.success(`${copyLabel}已复制`);
  };

  const rows = [
    {
      key: "wechat",
      title: `公众号 · ${SOCIAL_COPY.wechatName}`,
      value: SOCIAL_COPY.wechatName,
      copyLabel: "公众号",
      icon: <Ionicons name="logo-wechat" size={ICON_SIZE} color={brand} />,
    },
    {
      key: "qq",
      title: `QQ 群 · ${SOCIAL_COPY.qqGroup}`,
      value: SOCIAL_COPY.qqGroup,
      copyLabel: "QQ群号",
      icon: <FontAwesome name="qq" size={ICON_SIZE} color={brand} />,
    },
  ];

  return (
    <HomeSurface style={[styles.card, { opacity }]}>
      {rows.map((row, index) => (
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
          <View style={styles.iconBox}>{row.icon}</View>
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

const useStyles = createThemedStyles((t) => ({
  card: {
    marginHorizontal: t.space.md,
    marginBottom: t.space.sm,
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
    borderTopColor: t.color.border,
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
    backgroundColor: t.color.brandMuted,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: t.color.text,
  },
  hintPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: t.color.brandMuted,
  },
  hint: {
    fontSize: 11,
    fontWeight: "600",
    color: t.color.brand,
  },
}));

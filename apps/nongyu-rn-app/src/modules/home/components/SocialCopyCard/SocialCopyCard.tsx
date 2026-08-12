import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { HomeSurface } from "@/modules/home/components/HomeSurface";
import { SOCIAL_COPY } from "@/modules/home/constants/social";
import { lightTokens } from "@/theme/tokens";

type CopyRow = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  copyLabel: string;
};

const ROWS: CopyRow[] = [
  {
    key: "wechat",
    icon: "logo-wechat",
    title: `公众号 · ${SOCIAL_COPY.wechatName}`,
    value: SOCIAL_COPY.wechatName,
    copyLabel: "公众号",
  },
  {
    key: "qq",
    icon: "chatbubbles",
    title: `QQ 群 · ${SOCIAL_COPY.qqGroup}`,
    value: SOCIAL_COPY.qqGroup,
    copyLabel: "QQ群号",
  },
];

/**
 * 公众号 / QQ 复制卡片
 */
export function SocialCopyCard() {
  const copyText = async (value: string, copyLabel: string) => {
    await Clipboard.setStringAsync(value);
    Toast.show({
      type: "success",
      text1: `${copyLabel}已复制`,
    });
  };

  return (
    <HomeSurface style={styles.card}>
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
          <View style={styles.iconBox}>
            <Ionicons name={row.icon} size={17} color={lightTokens.color.brand} />
          </View>
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

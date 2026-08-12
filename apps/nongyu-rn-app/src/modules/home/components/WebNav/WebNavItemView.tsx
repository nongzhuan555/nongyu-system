import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppLinearGradient } from "@/components/ui/AppLinearGradient";
import type { WebNavItem } from "@/modules/home/constants/webNav";
import { lightTokens } from "@/theme/tokens";

/** 单格固定高度：图标 40 + 间距 6 + 文案行高 14，用于精确算出 3 行面板高 */
export const WEB_NAV_ITEM_HEIGHT = 60;

type WebNavItemViewProps = {
  item: WebNavItem;
  onPress: (item: WebNavItem) => void;
};

/**
 * 单个网站格子
 */
export function WebNavItemView({ item, onPress }: WebNavItemViewProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.text}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      onPress={() => onPress(item)}
    >
      <View style={styles.iconShell}>
        <AppLinearGradient
          colors={["#FFFFFF", lightTokens.color.brandMuted]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}
        >
          <Text style={styles.iconLetter}>{item.text.slice(0, 1)}</Text>
        </AppLinearGradient>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {item.text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    width: "25%",
    height: WEB_NAV_ITEM_HEIGHT,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  iconShell: {
    width: 40,
    height: 40,
    borderRadius: 14,
    marginBottom: 6,
    overflow: "hidden",
    shadowColor: "#0A7C59",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  iconGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.12)",
    borderRadius: 14,
  },
  iconLetter: {
    fontSize: 15,
    fontWeight: "700",
    color: lightTokens.color.brand,
  },
  title: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
    textAlign: "center",
    color: lightTokens.color.text,
  },
});

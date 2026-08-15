import { useThemeTokens } from "@/theme/ThemeProvider";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { HOME_FIELD_CHROME } from "@/modules/home/constants/fieldChrome";
import { createThemedStyles } from "@/theme/createThemedStyles";

type SkeletonBoxProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * 通用骨架块（脉冲）
 */
export function SkeletonBox({
  width = "100%",
  height = 16,
  borderRadius,
  style,
}: SkeletonBoxProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const finalBorderRadius = borderRadius ?? t.radius.sm;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.box,
        {
          width,
          height,
          borderRadius: finalBorderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * 通知栏骨架：与网站搜索框同形（共用 HOME_FIELD_CHROME）
 */
export function NoticeBarSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.noticeSkel}>
      <View style={styles.noticeFrost} pointerEvents="none" />
      <View style={styles.noticeRow}>
        <SkeletonBox width={15} height={15} borderRadius={4} />
        <SkeletonBox height={13} style={styles.noticeLine} />
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  box: {
    backgroundColor: t.color.border,
  },
  noticeSkel: {
    marginHorizontal: t.space.md,
    marginTop: 2,
    marginBottom: t.space.md,
    height: HOME_FIELD_CHROME.height,
    borderRadius: HOME_FIELD_CHROME.radius,
    overflow: "hidden",
    borderWidth: HOME_FIELD_CHROME.borderWidth,
    borderColor: HOME_FIELD_CHROME.borderColor,
    backgroundColor: "transparent",
  },
  noticeFrost: {
    ...StyleSheet.absoluteFill,
    backgroundColor: HOME_FIELD_CHROME.frost,
  },
  noticeRow: {
    flex: 1,
    height: HOME_FIELD_CHROME.height,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  noticeLine: {
    flex: 1,
  },
}));

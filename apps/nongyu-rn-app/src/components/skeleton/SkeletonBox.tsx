import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { HOME_FIELD_CHROME } from "@/modules/home/constants/fieldChrome";
import { lightTokens } from "@/theme/tokens";

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
  borderRadius = lightTokens.radius.sm,
  style,
}: SkeletonBoxProps) {
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
          borderRadius,
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

const styles = StyleSheet.create({
  box: {
    backgroundColor: lightTokens.color.border,
  },
  noticeSkel: {
    marginHorizontal: lightTokens.space.md,
    marginTop: 2,
    marginBottom: lightTokens.space.md,
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
});

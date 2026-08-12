import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
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
 * 通知栏同尺寸骨架（无白底，与正式态对齐）
 */
export function NoticeBarSkeleton() {
  return (
    <View style={styles.noticeSkel}>
      <SkeletonBox width={28} height={28} borderRadius={10} />
      <SkeletonBox height={13} style={styles.noticeLine} />
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
    paddingHorizontal: 2,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 40,
  },
  noticeLine: {
    flex: 1,
  },
});

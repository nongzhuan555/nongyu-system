import { View } from "react-native";
import { SkeletonBox } from "@/components/skeleton/SkeletonBox";
import { GREETING_RESERVED_HEIGHT } from "@/modules/home/constants/greeting";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 首页打招呼骨架：最多三行脉冲，对齐问候区预留高度
 */
export function GreetingSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.wrap} accessibilityLabel="问候加载中">
      <SkeletonBox height={22} width="62%" borderRadius={6} />
      <SkeletonBox height={22} width="88%" borderRadius={6} />
      <SkeletonBox height={22} width="74%" borderRadius={6} />
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  wrap: {
    width: "100%",
    paddingHorizontal: t.space.md,
    paddingTop: 0,
    paddingBottom: 4,
    minHeight: GREETING_RESERVED_HEIGHT,
    justifyContent: "center",
    gap: 8,
  },
}));

import { StyleSheet, View } from "react-native";
import { SkeletonBox } from "@/components/skeleton/SkeletonBox";
import { lightTokens } from "@/theme/tokens";

/**
 * 广场帖子列表骨架（圆润卡片，对齐 PostCard）
 */
export function PostListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBox height={16} width="68%" borderRadius={6} />
          <SkeletonBox height={12} width="100%" style={styles.line} borderRadius={6} />
          <SkeletonBox height={12} width="82%" borderRadius={6} />
          <SkeletonBox height={10} width="36%" style={styles.meta} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: lightTokens.space.xs,
    gap: lightTokens.space.sm,
  },
  card: {
    backgroundColor: lightTokens.color.surface,
    borderRadius: lightTokens.radius.lg,
    paddingHorizontal: lightTokens.space.md,
    paddingVertical: lightTokens.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
    gap: 6,
  },
  line: {
    marginTop: 2,
  },
  meta: {
    marginTop: 4,
  },
});

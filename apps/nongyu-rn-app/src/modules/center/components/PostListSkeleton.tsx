import { StyleSheet, View } from "react-native";
import { SkeletonBox } from "@/components/skeleton/SkeletonBox";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 广场帖子列表骨架（圆润卡片，对齐 PostCard）
 */
export function PostListSkeleton({ rows = 5 }: { rows?: number }) {
  const styles = useStyles();
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

const useStyles = createThemedStyles((t) => ({
  wrap: {
    paddingTop: t.space.xs,
    gap: t.space.sm,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    gap: 6,
  },
  line: {
    marginTop: 2,
  },
  meta: {
    marginTop: 4,
  },
}));

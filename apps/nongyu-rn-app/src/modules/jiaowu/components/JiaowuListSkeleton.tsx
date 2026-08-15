import { StyleSheet, View } from "react-native";
import { SkeletonBox } from "@/components/skeleton/SkeletonBox";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 教务列表骨架
 */
export function JiaowuListSkeleton({ rows = 6 }: { rows?: number }) {
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBox height={16} width="72%" />
          <SkeletonBox height={12} width="48%" style={styles.line} />
        </View>
      ))}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  wrap: {
    gap: t.space.sm,
    paddingTop: t.space.sm,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.md,
    padding: t.space.md,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  line: {
    marginTop: 2,
  },
}));

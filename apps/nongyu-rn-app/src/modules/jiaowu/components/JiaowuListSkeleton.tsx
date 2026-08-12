import { StyleSheet, View } from "react-native";
import { SkeletonBox } from "@/components/skeleton/SkeletonBox";
import { lightTokens } from "@/theme/tokens";

/**
 * 教务列表骨架
 */
export function JiaowuListSkeleton({ rows = 6 }: { rows?: number }) {
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

const styles = StyleSheet.create({
  wrap: {
    gap: lightTokens.space.sm,
    paddingTop: lightTokens.space.sm,
  },
  card: {
    backgroundColor: lightTokens.color.surface,
    borderRadius: lightTokens.radius.md,
    padding: lightTokens.space.md,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
  },
  line: {
    marginTop: 2,
  },
});

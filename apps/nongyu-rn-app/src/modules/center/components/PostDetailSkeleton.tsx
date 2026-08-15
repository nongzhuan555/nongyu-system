import { StyleSheet, View } from "react-native";
import { SkeletonBox } from "@/components/skeleton/SkeletonBox";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 帖子详情骨架：标题 + 元信息 + 分隔 + 多行正文
 */
export function PostDetailSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.wrap} accessibilityLabel="详情加载中">
      <SkeletonBox height={24} width="88%" borderRadius={4} />
      <SkeletonBox height={24} width="52%" borderRadius={4} style={styles.titleLine} />
      <SkeletonBox height={12} width="44%" style={styles.meta} borderRadius={4} />
      <View style={styles.rule} />
      <View style={styles.body}>
        <SkeletonBox height={14} width="100%" borderRadius={4} />
        <SkeletonBox height={14} width="100%" borderRadius={4} />
        <SkeletonBox height={14} width="94%" borderRadius={4} />
        <SkeletonBox height={14} width="100%" borderRadius={4} />
        <SkeletonBox height={14} width="72%" borderRadius={4} />
        <SkeletonBox height={14} width="86%" borderRadius={4} />
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  wrap: {
    gap: 0,
  },
  titleLine: {
    marginTop: 10,
  },
  meta: {
    marginTop: t.space.md,
  },
  rule: {
    marginTop: t.space.lg,
    marginBottom: t.space.lg,
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
  },
  body: {
    gap: 12,
  },
}));

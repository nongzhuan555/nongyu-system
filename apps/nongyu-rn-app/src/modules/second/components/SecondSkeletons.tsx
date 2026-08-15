import { useThemeTokens } from "@/theme/ThemeProvider";
import { StyleSheet, View } from "react-native";
import { SkeletonBox } from "@/components/skeleton/SkeletonBox";
import { SecondSurface } from "@/modules/second/components/SecondSurface";

/**
 * 二课活动列表骨架（封面 + 文案）
 */
export function SecondActivityListSkeleton({ rows = 5 }: { rows?: number }) {
  const t = useThemeTokens();
  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <SecondSurface key={i} padded={false} style={styles.card}>
          <View style={styles.row}>
            <SkeletonBox width={96} height={96} borderRadius={t.radius.md} />
            <View style={styles.copy}>
              <SkeletonBox height={16} width="88%" />
              <SkeletonBox height={16} width="60%" style={styles.gap} />
              <View style={styles.chips}>
                <SkeletonBox height={18} width={52} borderRadius={4} />
                <SkeletonBox height={18} width={44} borderRadius={4} />
              </View>
              <SkeletonBox height={12} width="70%" style={styles.gap} />
              <SkeletonBox height={12} width="55%" />
            </View>
          </View>
        </SecondSurface>
      ))}
    </View>
  );
}

/**
 * 个人二课信息骨架
 */
export function SecondProfileSkeleton() {
  return (
    <View style={styles.profileWrap}>
      <View style={styles.avatarRow}>
        <SkeletonBox width={84} height={84} borderRadius={42} />
        <View style={styles.avatarCopy}>
          <SkeletonBox height={22} width="56%" />
          <View style={styles.chips}>
            <SkeletonBox height={22} width={64} borderRadius={4} />
            <SkeletonBox height={22} width={88} borderRadius={4} />
          </View>
        </View>
      </View>

      <SecondSurface style={styles.stats}>
        <View style={styles.scoreRow}>
          <View style={styles.scoreItem}>
            <SkeletonBox height={32} width={72} />
            <SkeletonBox height={12} width={56} style={styles.gap} />
          </View>
          <View style={styles.scoreItem}>
            <SkeletonBox height={32} width={72} />
            <SkeletonBox height={12} width={56} style={styles.gap} />
          </View>
        </View>
        <View style={styles.rankGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.rankItem}>
              <SkeletonBox height={12} width={64} />
              <SkeletonBox height={18} width={48} style={styles.gap} />
            </View>
          ))}
        </View>
      </SecondSurface>

      <SkeletonBox height={18} width={96} style={styles.sectionTitle} />
      <SecondSurface>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.distItem}>
            <View style={styles.distHeader}>
              <SkeletonBox height={14} width="40%" />
              <SkeletonBox height={14} width={48} />
            </View>
            <SkeletonBox height={6} width="100%" borderRadius={3} />
          </View>
        ))}
      </SecondSurface>
    </View>
  );
}

/**
 * 活动详情骨架
 */
export function SecondDetailSkeleton() {
  return (
    <View style={styles.detailWrap}>
      <SkeletonBox height={24} width="86%" />
      <SkeletonBox height={24} width="52%" style={styles.gap} />
      <View style={styles.chips}>
        <SkeletonBox height={24} width={72} borderRadius={999} />
        <SkeletonBox height={24} width={64} borderRadius={999} />
        <SkeletonBox height={24} width={56} borderRadius={999} />
      </View>
      <SecondSurface style={styles.detailCard}>
        <SkeletonBox height={16} width={72} />
        <SkeletonBox height={14} width="90%" style={styles.gap} />
        <SkeletonBox height={14} width="70%" style={styles.gap} />
        <SkeletonBox height={14} width="60%" style={styles.gap} />
      </SecondSurface>
      <SecondSurface style={styles.detailCard}>
        <SkeletonBox height={16} width={72} />
        <SkeletonBox height={14} width="100%" style={styles.gap} />
        <SkeletonBox height={14} width="100%" style={styles.gap} />
        <SkeletonBox height={14} width="78%" style={styles.gap} />
      </SecondSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 12,
    gap: 12,
  },
  card: {},
  row: {
    flexDirection: "row",
    padding: 12,
  },
  copy: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  gap: { marginTop: 8 },
  chips: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  profileWrap: {
    padding: 16,
    gap: 16,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginTop: 10,
  },
  avatarCopy: {
    flex: 1,
    marginLeft: 16,
    gap: 10,
  },
  stats: {
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  scoreItem: { alignItems: "center" },
  rankGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  rankItem: {
    width: "50%",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    marginTop: 4,
    marginBottom: 4,
  },
  distItem: {
    marginVertical: 8,
    gap: 8,
  },
  distHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailWrap: {
    padding: 16,
  },
  detailCard: {
    marginTop: 12,
  },
});

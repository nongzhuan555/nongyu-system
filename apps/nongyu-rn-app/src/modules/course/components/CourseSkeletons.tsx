import { View } from "react-native";
import { SkeletonBox } from "@/components/skeleton/SkeletonBox";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 课程详情扩展区骨架（考勤 + 备注 + 待办占位）
 */
export function CourseDetailExtensionsSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.detailExt} accessibilityLabel="加载中">
      <SkeletonBox height={14} width={72} style={styles.sectionGap} />
      <View style={styles.chipRow}>
        <SkeletonBox height={32} width={64} borderRadius={8} />
        <SkeletonBox height={32} width={64} borderRadius={8} />
        <SkeletonBox height={32} width={64} borderRadius={8} />
        <SkeletonBox height={32} width={64} borderRadius={8} />
      </View>
      <SkeletonBox height={40} width="70%" borderRadius={10} style={styles.sectionGap} />
      <SkeletonBox height={14} width={48} style={styles.sectionGap} />
      <SkeletonBox height={48} width="100%" borderRadius={14} />
      <SkeletonBox height={56} width="100%" borderRadius={12} style={styles.cardGap} />
      <SkeletonBox height={14} width={48} style={styles.sectionGap} />
      <SkeletonBox height={48} width="100%" borderRadius={14} />
      <SkeletonBox height={48} width="100%" borderRadius={12} style={styles.cardGap} />
    </View>
  );
}

/**
 * 日程表单整页骨架
 */
export function ScheduleFormSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.form} accessibilityLabel="加载中">
      <SkeletonBox height={20} width={96} style={styles.formHeader} />
      <SkeletonBox height={13} width={40} style={styles.labelGap} />
      <SkeletonBox height={44} width="100%" borderRadius={8} />
      <SkeletonBox height={13} width={40} style={styles.labelGap} />
      <SkeletonBox height={44} width="100%" borderRadius={8} />
      <SkeletonBox height={13} width={40} style={styles.labelGap} />
      <SkeletonBox height={80} width="100%" borderRadius={8} />
      <SkeletonBox height={13} width={40} style={styles.labelGap} />
      <View style={styles.chipRow}>
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBox key={i} height={36} style={styles.dayChip} borderRadius={8} />
        ))}
      </View>
      <View style={styles.periodRow}>
        <SkeletonBox height={44} style={styles.periodCol} borderRadius={8} />
        <SkeletonBox height={44} style={styles.periodCol} borderRadius={8} />
      </View>
      <SkeletonBox height={48} width="100%" borderRadius={10} style={styles.saveGap} />
    </View>
  );
}

/**
 * 课表 Tab 首屏周视图骨架
 */
export function CourseWeekSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.week} accessibilityLabel="课表加载中">
      <View style={styles.weekHeader}>
        <SkeletonBox height={28} width={40} borderRadius={6} />
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBox key={i} height={36} style={styles.weekHeaderCell} borderRadius={6} />
        ))}
      </View>
      {Array.from({ length: 5 }).map((_, r) => (
        <View key={r} style={styles.weekRow}>
          <SkeletonBox height={72} width={36} borderRadius={6} />
          {Array.from({ length: 7 }).map((_, c) => (
            <SkeletonBox key={c} height={72} style={styles.weekCell} borderRadius={6} />
          ))}
        </View>
      ))}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  detailExt: {
    marginTop: 8,
  },
  sectionGap: {
    marginTop: 26,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cardGap: {
    marginTop: 8,
  },
  form: {
    paddingBottom: 8,
  },
  formHeader: {
    alignSelf: "center",
    marginBottom: 16,
  },
  labelGap: {
    marginTop: 12,
    marginBottom: 6,
  },
  dayChip: {
    flex: 1,
    minWidth: 36,
  },
  periodRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  periodCol: {
    flex: 1,
  },
  saveGap: {
    marginTop: 24,
  },
  week: {
    flex: 1,
    marginHorizontal: 4,
    paddingTop: 4,
    gap: 6,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  weekHeaderCell: {
    flex: 1,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 4,
  },
  weekCell: {
    flex: 1,
  },
}));

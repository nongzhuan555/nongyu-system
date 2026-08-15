import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { getRankInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { createThemedStyles } from "@/theme/createThemedStyles";

type RankData = NonNullable<Awaited<ReturnType<typeof getRankInfo>>["result"]>;

/**
 * 专业排名页：展签式布局，巨型排名为主角
 */
export function RankScreen() {
  const { data, isPending, isError, error, isFetching, isRefetching, refresh } = useJiaowuQuery({
    resource: "rank",
    requireAuth: true,
    queryFn: getRankInfo,
  });

  const hasData = !!data;

  return (
    <JiaowuPageShell
      title="专业排名"
      loading={isPending && !data}
      error={isError && !data}
      errorMessage={error instanceof Error ? error.message : undefined}
      empty={data === null}
      emptyText="暂无排名数据"
      onRetry={refresh}
      refreshing={isRefetching}
      onRefresh={refresh}
      fetchingHint={isFetching && hasData && !isRefetching}
    >
      {data ? <RankExhibit data={data} /> : null}
    </JiaowuPageShell>
  );
}

/**
 * 展签内容：身份 → 巨型排名（入场动效）→ 辅指标
 */
function RankExhibit({ data }: { data: RankData }) {
  const styles = useStyles();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const playedRef = useRef(false);

  useEffect(() => {
    if (playedRef.current) return;
    playedRef.current = true;

    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => {
      cancelled = true;
    };
  }, [opacity, translateY]);

  const meta = [data.campus, data.college, data.major, data.className, data.grade]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.panel}>
      <View style={styles.identity}>
        <Text style={styles.name}>
          {data.name || "同学"}
          {data.studentId ? ` · ${data.studentId}` : ""}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      <Animated.View style={[styles.hero, { opacity, transform: [{ translateY }] }]}>
        <Text
          style={styles.rankNumber}
          accessibilityRole="text"
          accessibilityLabel={`专业排名 ${data.majorRank ?? "暂无"}`}
        >
          {data.majorRank?.trim() ? data.majorRank : "-"}
        </Text>
        <Text style={styles.rankCaption}>专业排名 · 名</Text>
      </Animated.View>

      <View style={styles.divider} />

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>加权成绩</Text>
          <Text style={styles.metricValue}>
            {data.weightedScore?.trim() ? data.weightedScore : "-"}
          </Text>
        </View>
        <View style={styles.metricRule} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>学籍</Text>
          <Text style={styles.metricValue}>{data.status?.trim() ? data.status : "-"}</Text>
        </View>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  panel: {
    marginTop: t.space.sm,
    paddingVertical: t.space.lg,
    paddingHorizontal: t.space.md,
    gap: t.space.lg,
  },
  identity: {
    gap: 6,
  },
  name: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
    letterSpacing: 0.2,
  },
  meta: {
    fontSize: 12,
    lineHeight: 18,
    color: t.color.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
  },
  hero: {
    alignItems: "center",
    paddingVertical: t.space.xl,
    gap: t.space.sm,
  },
  rankNumber: {
    fontSize: 72,
    fontWeight: "700",
    color: t.color.brand,
    letterSpacing: -1.5,
    lineHeight: 80,
    fontVariant: ["tabular-nums"],
  },
  rankCaption: {
    fontSize: 12,
    fontWeight: "500",
    color: t.color.textSecondary,
    letterSpacing: 2,
  },
  metrics: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingTop: t.space.xs,
  },
  metric: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: t.space.sm,
  },
  metricRule: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
    alignSelf: "stretch",
  },
  metricLabel: {
    fontSize: 11,
    color: t.color.textSecondary,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
  },
}));

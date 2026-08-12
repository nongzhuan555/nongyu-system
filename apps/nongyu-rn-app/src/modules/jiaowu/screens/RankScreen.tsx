import { StyleSheet, Text, View } from "react-native";
import { getRankInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { lightTokens } from "@/theme/tokens";

/**
 * 专业排名页（单条卡片）
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
      {data ? (
        <View style={styles.card}>
          <Text style={styles.name}>
            {data.name} · {data.studentId}
          </Text>
          <Text style={styles.meta}>
            {[data.campus, data.college, data.major, data.className, data.grade]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>加权成绩</Text>
              <Text style={styles.statValue}>{data.weightedScore ?? "-"}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>专业排名</Text>
              <Text style={styles.statValue}>{data.majorRank ?? "-"}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>学籍</Text>
              <Text style={styles.statValue}>{data.status ?? "-"}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </JiaowuPageShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightTokens.color.surface,
    borderRadius: lightTokens.radius.lg,
    padding: lightTokens.space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
    gap: lightTokens.space.md,
  },
  name: {
    fontSize: lightTokens.fontSize.lg,
    fontWeight: "700",
    color: lightTokens.color.text,
  },
  meta: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
    lineHeight: 20,
  },
  stats: {
    flexDirection: "row",
    gap: lightTokens.space.sm,
    marginTop: lightTokens.space.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: lightTokens.color.brandMuted,
    borderRadius: lightTokens.radius.md,
    padding: lightTokens.space.md,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: lightTokens.color.textSecondary,
  },
  statValue: {
    fontSize: lightTokens.fontSize.lg,
    fontWeight: "700",
    color: lightTokens.color.brand,
  },
});

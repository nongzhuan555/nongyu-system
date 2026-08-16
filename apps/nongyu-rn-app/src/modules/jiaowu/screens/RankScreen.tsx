import { StyleSheet, Text, View } from "react-native";
import { getRankInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { createThemedStyles } from "@/theme/createThemedStyles";

type RankData = NonNullable<Awaited<ReturnType<typeof getRankInfo>>["result"]>;

/**
 * 专业排名页：成绩册裁切页布局
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
      title="专业排名（有效必修加权）"
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
      {data ? <RankTranscriptCard data={data} /> : null}
    </JiaowuPageShell>
  );
}

/**
 * 单卡：身份 → 第 N 名 → 加权 / 学籍行
 */
function RankTranscriptCard({ data }: { data: RankData }) {
  const styles = useStyles();
  const meta = [data.campus, data.college, data.major, data.className, data.grade]
    .filter(Boolean)
    .join(" · ");
  const rank = data.majorRank?.trim() ? data.majorRank.trim() : "-";

  return (
    <View style={styles.card}>
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

      <View
        style={styles.rankBlock}
        accessibilityRole="text"
        accessibilityLabel={`专业排名第 ${rank} 名`}
      >
        <View style={styles.rankRow}>
          <Text style={styles.rankSide}>第</Text>
          <Text style={styles.rankNumber}>{rank}</Text>
          <Text style={styles.rankSide}>名</Text>
        </View>
        <Text style={styles.rankHint}>专业内排名</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.rows}>
        <DetailRow label="加权平均" value={data.weightedScore?.trim() ? data.weightedScore : "-"} />
        <DetailRow label="学籍状态" value={data.status?.trim() ? data.status : "-"} />
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  card: {
    marginTop: t.space.sm,
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.lg,
    paddingBottom: t.space.md,
    gap: t.space.lg,
  },
  identity: {
    gap: 6,
  },
  name: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
  },
  meta: {
    fontSize: 12,
    lineHeight: 18,
    color: t.color.textSecondary,
  },
  rankBlock: {
    alignItems: "center",
    gap: 8,
    paddingVertical: t.space.sm,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  rankSide: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.textSecondary,
  },
  rankNumber: {
    fontSize: 44,
    fontWeight: "700",
    color: t.color.brand,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
    lineHeight: 52,
  },
  rankHint: {
    fontSize: 12,
    color: t.color.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
  },
  rows: {
    gap: t.space.md,
    paddingBottom: t.space.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: t.space.md,
  },
  rowLabel: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
    textAlign: "right",
  },
}));

import { StyleSheet, Text, View } from "react-native";
import { getScoreInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { lightTokens } from "@/theme/tokens";

type ScoreRow = Awaited<ReturnType<typeof getScoreInfo>>["result"][number];

/**
 * 按学期分组成绩
 */
function groupByTerm(items: ScoreRow[]): { term: string; items: ScoreRow[] }[] {
  const map = new Map<string, ScoreRow[]>();
  for (const item of items) {
    const term = item.term || "未知学期";
    const bucket = map.get(term);
    if (bucket) bucket.push(item);
    else map.set(term, [item]);
  }
  return Array.from(map.entries())
    .map(([term, group]) => ({ term, items: group }))
    .sort((a, b) => b.term.localeCompare(a.term));
}

/**
 * 成绩查询页
 */
export function ScoreScreen() {
  const { data, isPending, isError, isFetching, isRefetching, refresh } = useJiaowuQuery({
    resource: "score",
    requireAuth: true,
    queryFn: getScoreInfo,
  });

  const list = data ?? [];
  const groups = groupByTerm(list);
  const hasData = list.length > 0;

  return (
    <JiaowuPageShell
      title="成绩查询"
      loading={isPending && !data}
      error={isError && !data}
      empty={!!data && list.length === 0}
      emptyText="暂无成绩"
      onRetry={refresh}
      refreshing={isRefetching}
      onRefresh={refresh}
      fetchingHint={isFetching && hasData && !isRefetching}
    >
      <View style={styles.list}>
        {groups.map((group) => (
          <View key={group.term} style={styles.group}>
            <Text style={styles.term}>{group.term}</Text>
            {group.items.map((item, index) => (
              <View key={`${item.courseName}-${index}`} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.course} numberOfLines={2}>
                    {item.courseName || "未命名课程"}
                  </Text>
                  <Text style={styles.score}>{item.score ?? "-"}</Text>
                </View>
                <Text style={styles.meta}>
                  {[
                    item.credit ? `${item.credit} 学分` : null,
                    item.gradePoint ? `绩点 ${item.gradePoint}` : null,
                    item.courseType,
                    item.source,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </JiaowuPageShell>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: lightTokens.space.md,
  },
  group: {
    gap: lightTokens.space.sm,
  },
  term: {
    fontSize: lightTokens.fontSize.md,
    fontWeight: "700",
    color: lightTokens.color.brand,
    marginBottom: 2,
  },
  card: {
    backgroundColor: lightTokens.color.surface,
    borderRadius: lightTokens.radius.md,
    padding: lightTokens.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
    gap: 6,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  course: {
    flex: 1,
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
    color: lightTokens.color.text,
    lineHeight: 22,
  },
  score: {
    fontSize: lightTokens.fontSize.lg,
    fontWeight: "700",
    color: lightTokens.color.brand,
  },
  meta: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
  },
});

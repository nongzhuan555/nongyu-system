import { StyleSheet, Text, View } from "react-native";
import { getScoreInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useDeferredLocalSearch } from "@/modules/jiaowu/hooks/useDeferredLocalSearch";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { matchSearchQuery } from "@/modules/jiaowu/utils/search";
import { createThemedStyles } from "@/theme/createThemedStyles";

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
  const styles = useStyles();
  const { data, isPending, isError, error, isFetching, isRefetching, refresh } = useJiaowuQuery({
    resource: "score",
    requireAuth: true,
    queryFn: getScoreInfo,
  });
  const { draft, setDraft, query, searching } = useDeferredLocalSearch();

  const list = data ?? [];
  const hasData = list.length > 0;
  const filtered = list.filter((item) =>
    matchSearchQuery(query, item.courseName, item.term, item.courseType, item.source),
  );
  const groups = groupByTerm(filtered);
  const noSearchHit = hasData && !searching && query.trim().length > 0 && filtered.length === 0;

  return (
    <JiaowuPageShell
      title="成绩查询"
      loading={isPending && !data}
      error={isError && !data}
      errorMessage={error instanceof Error ? error.message : undefined}
      empty={(!!data && list.length === 0) || noSearchHit}
      emptyText={noSearchHit ? "未找到相关结果" : "暂无成绩"}
      onRetry={refresh}
      refreshing={isRefetching}
      onRefresh={refresh}
      fetchingHint={isFetching && hasData && !isRefetching}
      search={
        hasData
          ? {
              value: draft,
              onChangeText: setDraft,
              placeholder: "搜索课程、学期、类型…",
              searching,
            }
          : undefined
      }
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

const useStyles = createThemedStyles((t) => ({
  list: {
    gap: t.space.md,
  },
  group: {
    gap: t.space.sm,
  },
  term: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.brand,
    marginBottom: 2,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.md,
    padding: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    gap: 6,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  course: {
    flex: 1,
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
    lineHeight: 22,
  },
  score: {
    fontSize: t.fontSize.lg,
    fontWeight: "700",
    color: t.color.brand,
  },
  meta: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
}));

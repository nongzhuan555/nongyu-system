import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getScoreInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useDeferredLocalSearch } from "@/modules/jiaowu/hooks/useDeferredLocalSearch";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { matchSearchQuery } from "@/modules/jiaowu/utils/search";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { createThemedStyles } from "@/theme/createThemedStyles";

type ScoreRow = Awaited<ReturnType<typeof getScoreInfo>>["result"][number];
type TermGroup = { term: string; items: ScoreRow[] };

/**
 * 按学期分组成绩（学期名降序，最近学期靠前）
 */
function groupByTerm(items: ScoreRow[]): TermGroup[] {
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

/** 无搜索：仅展开第一组；有搜索：展开全部有命中的组 */
function defaultExpandedTerms(groups: TermGroup[], queryActive: boolean): Set<string> {
  if (groups.length === 0) return new Set();
  if (queryActive) return new Set(groups.map((g) => g.term));
  return new Set([groups[0]!.term]);
}

type TermSectionProps = {
  group: TermGroup;
  expanded: boolean;
  onToggle: () => void;
};

/**
 * 学期分区：可点学期头展开/收起成绩列表
 */
function TermSection({ group, expanded, onToggle }: TermSectionProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const countLabel = `${group.items.length} 门`;

  return (
    <View style={styles.group}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${group.term}，${countLabel}，${expanded ? "已展开" : "已收起"}`}
        onPress={onToggle}
        style={({ pressed }) => [styles.termHeader, pressed && styles.termHeaderPressed]}
      >
        <View style={styles.termLeft}>
          <Text style={styles.term} numberOfLines={1}>
            {group.term}
          </Text>
          <Text style={styles.termCount}>{countLabel}</Text>
        </View>
        <Ionicons
          name="chevron-down"
          size={18}
          color={t.color.brand}
          style={{ transform: [{ rotate: expanded ? "0deg" : "-90deg" }] }}
        />
      </Pressable>
      {expanded
        ? group.items.map((item, index) => (
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
          ))
        : null}
    </View>
  );
}

/**
 * 成绩查询页（按学期折叠）
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
  const queryActive = query.trim().length > 0;
  const groupKey = groups.map((g) => `${g.term}:${g.items.length}`).join("|");

  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(() =>
    defaultExpandedTerms(groups, queryActive),
  );

  useEffect(() => {
    // 下拉刷新进行中不打断；结束后按 Spec 恢复默认展开策略
    if (isRefetching) return;
    setExpandedTerms(defaultExpandedTerms(groups, queryActive));
    // groups 通过 groupKey 同步；避免每次 render 新数组引用误触发
    // eslint-disable-next-line react-hooks/exhaustive-deps -- groupKey 已覆盖 groups 结构
  }, [queryActive, groupKey, isRefetching]);

  const toggleTerm = (term: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });
  };

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
          <TermSection
            key={group.term}
            group={group}
            expanded={expandedTerms.has(group.term)}
            onToggle={() => toggleTerm(group.term)}
          />
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
  termHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  termHeaderPressed: {
    opacity: 0.7,
  },
  termLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    minWidth: 0,
  },
  term: {
    flexShrink: 1,
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.brand,
  },
  termCount: {
    fontSize: t.fontSize.sm,
    fontWeight: "500",
    color: t.color.textSecondary,
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

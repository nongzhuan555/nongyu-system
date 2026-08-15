import { StyleSheet, Text, View } from "react-native";
import { getProgressInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useDeferredLocalSearch } from "@/modules/jiaowu/hooks/useDeferredLocalSearch";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { parseProgressPercent } from "@/modules/jiaowu/utils/parseProgressPercent";
import { matchSearchQuery } from "@/modules/jiaowu/utils/search";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 学业进度页
 */
export function ProgressScreen() {
  const styles = useStyles();
  const { data, isPending, isError, error, isFetching, isRefetching, refresh } = useJiaowuQuery({
    resource: "progress",
    requireAuth: true,
    queryFn: getProgressInfo,
  });
  const { draft, setDraft, query, searching } = useDeferredLocalSearch();

  const list = data ?? [];
  const hasData = list.length > 0;
  const filtered = list.filter((item) => matchSearchQuery(query, item.type));
  const noSearchHit = hasData && !searching && query.trim().length > 0 && filtered.length === 0;

  return (
    <JiaowuPageShell
      title="学业进度"
      loading={isPending && !data}
      error={isError && !data}
      errorMessage={error instanceof Error ? error.message : undefined}
      empty={(!!data && list.length === 0) || noSearchHit}
      emptyText={noSearchHit ? "未找到相关结果" : "暂无进度数据"}
      onRetry={refresh}
      refreshing={isRefetching}
      onRefresh={refresh}
      fetchingHint={isFetching && hasData && !isRefetching}
      search={
        hasData
          ? {
              value: draft,
              onChangeText: setDraft,
              placeholder: "搜索学分类型",
              searching,
            }
          : undefined
      }
    >
      <View style={styles.list}>
        {filtered.map((item, index) => {
          const percent = parseProgressPercent(item.progress);
          return (
            <View key={`${item.type}-${index}`} style={styles.card}>
              <Text style={styles.type}>{item.type.replace(/\n/g, " ")}</Text>
              <View style={styles.row}>
                <Meta label="应修" value={item.required} />
                <Meta label="已修" value={item.earned.replace(/\n/g, " ")} />
                <Meta label="进度" value={item.progress} highlight />
              </View>
              {percent != null ? (
                <View
                  style={styles.track}
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
                >
                  <View style={[styles.fill, { width: `${percent}%` }]} />
                </View>
              ) : null}
              <Text style={styles.diff}>
                学分差 {item.diff} · 可结转 {item.transfer}
              </Text>
            </View>
          );
        })}
      </View>
    </JiaowuPageShell>
  );
}

function Meta({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, highlight && styles.highlight]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  list: {
    gap: t.space.sm,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.md,
    padding: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    gap: 10,
  },
  type: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
  },
  row: {
    flexDirection: "row",
    gap: t.space.sm,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: t.color.textSecondary,
  },
  metaValue: {
    fontSize: t.fontSize.sm,
    color: t.color.text,
    fontWeight: "600",
  },
  highlight: {
    color: t.color.brand,
  },
  track: {
    height: 7,
    borderRadius: 999,
    backgroundColor: t.color.border,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: t.color.brand,
  },
  diff: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
}));

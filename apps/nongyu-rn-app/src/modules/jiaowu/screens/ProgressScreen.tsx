import { StyleSheet, Text, View } from "react-native";
import { getProgressInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { lightTokens } from "@/theme/tokens";

/**
 * 学业进度页
 */
export function ProgressScreen() {
  const { data, isPending, isError, isFetching, isRefetching, refresh } = useJiaowuQuery({
    resource: "progress",
    requireAuth: true,
    queryFn: getProgressInfo,
  });

  const list = data ?? [];
  const hasData = list.length > 0;

  return (
    <JiaowuPageShell
      title="学业进度"
      loading={isPending && !data}
      error={isError && !data}
      empty={!!data && list.length === 0}
      emptyText="暂无进度数据"
      onRetry={refresh}
      refreshing={isRefetching}
      onRefresh={refresh}
      fetchingHint={isFetching && hasData && !isRefetching}
    >
      <View style={styles.list}>
        {list.map((item, index) => (
          <View key={`${item.type}-${index}`} style={styles.card}>
            <Text style={styles.type}>{item.type.replace(/\n/g, " ")}</Text>
            <View style={styles.row}>
              <Meta label="应修" value={item.required} />
              <Meta label="已修" value={item.earned.replace(/\n/g, " ")} />
              <Meta label="进度" value={item.progress} highlight />
            </View>
            <Text style={styles.diff}>
              学分差 {item.diff} · 可结转 {item.transfer}
            </Text>
          </View>
        ))}
      </View>
    </JiaowuPageShell>
  );
}

function Meta({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, highlight && styles.highlight]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: lightTokens.space.sm,
  },
  card: {
    backgroundColor: lightTokens.color.surface,
    borderRadius: lightTokens.radius.md,
    padding: lightTokens.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
    gap: 10,
  },
  type: {
    fontSize: lightTokens.fontSize.md,
    fontWeight: "700",
    color: lightTokens.color.text,
  },
  row: {
    flexDirection: "row",
    gap: lightTokens.space.sm,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: lightTokens.color.textSecondary,
  },
  metaValue: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.text,
    fontWeight: "600",
  },
  highlight: {
    color: lightTokens.color.brand,
  },
  diff: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
  },
});

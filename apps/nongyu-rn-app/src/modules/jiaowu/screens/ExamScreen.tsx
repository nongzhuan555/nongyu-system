import { StyleSheet, Text, View } from "react-native";
import { getExamInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useDeferredLocalSearch } from "@/modules/jiaowu/hooks/useDeferredLocalSearch";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { matchSearchQuery } from "@/modules/jiaowu/utils/search";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 考试安排页（独立于课表模块）
 */
export function ExamScreen() {
  const styles = useStyles();
  const { data, isPending, isError, error, isFetching, isRefetching, refresh } = useJiaowuQuery({
    resource: "exam",
    requireAuth: true,
    queryFn: getExamInfo,
  });
  const { draft, setDraft, query, searching } = useDeferredLocalSearch();

  const list = data ?? [];
  const hasData = list.length > 0;
  const filtered = list.filter((item) =>
    matchSearchQuery(query, item.courseName, item.examRoom, item.examTime, item.assessmentMethod),
  );
  const noSearchHit = hasData && !searching && query.trim().length > 0 && filtered.length === 0;

  return (
    <JiaowuPageShell
      title="考试安排"
      loading={isPending && !data}
      error={isError && !data}
      errorMessage={error instanceof Error ? error.message : undefined}
      empty={(!!data && list.length === 0) || noSearchHit}
      emptyText={noSearchHit ? "未找到相关结果" : "暂无考试安排"}
      onRetry={refresh}
      refreshing={isRefetching}
      onRefresh={refresh}
      fetchingHint={isFetching && hasData && !isRefetching}
      search={
        hasData
          ? {
              value: draft,
              onChangeText: setDraft,
              placeholder: "搜索课程、考场、时间…",
              searching,
            }
          : undefined
      }
    >
      <View style={styles.list}>
        {filtered.map((item, index) => (
          <View key={`${item.courseName}-${index}`} style={styles.card}>
            <Text style={styles.course}>{item.courseName || "未命名课程"}</Text>
            {item.examTime ? <Text style={styles.time}>{item.examTime}</Text> : null}
            <Text style={styles.meta}>
              {[
                item.examRoom,
                item.seatNumber ? `座位 ${item.seatNumber}` : null,
                item.assessmentMethod,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        ))}
      </View>
    </JiaowuPageShell>
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
    gap: 6,
  },
  course: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
  },
  time: {
    fontSize: t.fontSize.sm,
    color: t.color.brand,
    lineHeight: 20,
  },
  meta: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
}));

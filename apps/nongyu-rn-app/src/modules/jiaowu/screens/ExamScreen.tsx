import { StyleSheet, Text, View } from "react-native";
import { getExamInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { lightTokens } from "@/theme/tokens";

/**
 * 考试安排页（独立于课表模块）
 */
export function ExamScreen() {
  const { data, isPending, isError, isFetching, isRefetching, refresh } = useJiaowuQuery({
    resource: "exam",
    requireAuth: true,
    queryFn: getExamInfo,
  });

  const list = data ?? [];
  const hasData = list.length > 0;

  return (
    <JiaowuPageShell
      title="考试安排"
      loading={isPending && !data}
      error={isError && !data}
      empty={!!data && list.length === 0}
      emptyText="暂无考试安排"
      onRetry={refresh}
      refreshing={isRefetching}
      onRefresh={refresh}
      fetchingHint={isFetching && hasData && !isRefetching}
    >
      <View style={styles.list}>
        {list.map((item, index) => (
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
    gap: 6,
  },
  course: {
    fontSize: lightTokens.fontSize.md,
    fontWeight: "700",
    color: lightTokens.color.text,
  },
  time: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.brand,
    lineHeight: 20,
  },
  meta: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
  },
});

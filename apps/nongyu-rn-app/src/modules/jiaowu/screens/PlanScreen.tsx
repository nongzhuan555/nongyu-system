import { StyleSheet, Text, View } from "react-native";
import { getPlanInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { lightTokens } from "@/theme/tokens";

/**
 * 培养方案页：标题 + 课程列表
 */
export function PlanScreen() {
  const { data, isPending, isError, isFetching, isRefetching, refresh } = useJiaowuQuery({
    resource: "plan",
    requireAuth: true,
    queryFn: getPlanInfo,
  });

  const courses = data?.courses ?? [];
  const hasData = !!data;

  return (
    <JiaowuPageShell
      title="培养方案"
      loading={isPending && !data}
      error={isError && !data}
      empty={data === null || (!!data && courses.length === 0)}
      emptyText="暂无培养方案"
      onRetry={refresh}
      refreshing={isRefetching}
      onRefresh={refresh}
      fetchingHint={isFetching && hasData && !isRefetching}
    >
      {data ? (
        <View style={styles.wrap}>
          <Text style={styles.planTitle}>{data.title || "培养方案"}</Text>
          <View style={styles.list}>
            {courses.map((course, index) => (
              <View key={`${course.courseCode}-${index}`} style={styles.card}>
                <Text style={styles.courseName}>{course.courseName}</Text>
                <Text style={styles.meta}>
                  {[
                    course.courseCode,
                    course.courseType,
                    course.courseSystem,
                    course.credits ? `${course.credits} 学分` : null,
                    course.execSemester ? `第 ${course.execSemester} 学期` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </JiaowuPageShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: lightTokens.space.md,
  },
  planTitle: {
    fontSize: lightTokens.fontSize.lg,
    fontWeight: "700",
    color: lightTokens.color.brand,
  },
  list: {
    gap: lightTokens.space.sm,
  },
  card: {
    backgroundColor: lightTokens.color.surface,
    borderRadius: lightTokens.radius.md,
    padding: lightTokens.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
    gap: 4,
  },
  courseName: {
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
    color: lightTokens.color.text,
  },
  meta: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
    lineHeight: 18,
  },
});

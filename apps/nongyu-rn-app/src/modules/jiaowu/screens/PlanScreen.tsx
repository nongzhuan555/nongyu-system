import { StyleSheet, Text, View } from "react-native";
import { getPlanInfo } from "nongyu-tool-jiaowu";
import { JiaowuEmptyView } from "@/modules/jiaowu/components/JiaowuEmptyView";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useDeferredLocalSearch } from "@/modules/jiaowu/hooks/useDeferredLocalSearch";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { matchSearchQuery } from "@/modules/jiaowu/utils/search";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 培养方案页：标题 + 课程列表
 */
export function PlanScreen() {
  const styles = useStyles();
  const { data, isPending, isError, error, isFetching, isRefetching, refresh } = useJiaowuQuery({
    resource: "plan",
    requireAuth: true,
    queryFn: getPlanInfo,
  });
  const { draft, setDraft, query, searching } = useDeferredLocalSearch();

  const courses = data?.courses ?? [];
  const hasCourses = courses.length > 0;
  const hasData = !!data;
  const filtered = courses.filter((course) =>
    matchSearchQuery(query, course.courseName, course.courseCode, course.courseType),
  );
  const noSearchHit = hasCourses && !searching && query.trim().length > 0 && filtered.length === 0;

  return (
    <JiaowuPageShell
      title="培养方案"
      loading={isPending && !data}
      error={isError && !data}
      errorMessage={error instanceof Error ? error.message : undefined}
      empty={data === null || (!!data && courses.length === 0)}
      emptyText="暂无培养方案"
      onRetry={refresh}
      refreshing={isRefetching}
      onRefresh={refresh}
      fetchingHint={isFetching && hasData && !isRefetching}
      search={
        hasCourses
          ? {
              value: draft,
              onChangeText: setDraft,
              placeholder: "搜索课程名、代码、类型",
              searching,
            }
          : undefined
      }
    >
      {data ? (
        <View style={styles.wrap}>
          <Text style={styles.planTitle}>{data.title || "培养方案"}</Text>
          {noSearchHit ? (
            <JiaowuEmptyView text="未找到相关结果" />
          ) : (
            <View style={styles.list}>
              {filtered.map((course, index) => (
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
          )}
        </View>
      ) : null}
    </JiaowuPageShell>
  );
}

const useStyles = createThemedStyles((t) => ({
  wrap: {
    gap: t.space.md,
  },
  planTitle: {
    fontSize: t.fontSize.lg,
    fontWeight: "700",
    color: t.color.brand,
  },
  list: {
    gap: t.space.sm,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.md,
    padding: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    gap: 4,
  },
  courseName: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
  },
  meta: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 18,
  },
}));

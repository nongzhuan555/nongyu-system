import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { ExamScheduleList } from "@/modules/jiaowu/components/ExamScheduleList";
import { useExamSchedule } from "@/modules/jiaowu/hooks/useExamSchedule";

/**
 * 考试安排页（独立于课表模块）
 */
export function ExamScreen() {
  const exam = useExamSchedule();

  const loading = exam.isPending && !exam.data;
  const error = exam.isError && !exam.data;
  const empty = (!!exam.data && exam.list.length === 0) || exam.noSearchHit;

  return (
    <JiaowuPageShell
      title="考试安排（正考）"
      loading={loading}
      error={error}
      errorMessage={exam.error instanceof Error ? exam.error.message : undefined}
      empty={empty}
      emptyText={exam.noSearchHit ? "未找到相关结果" : "暂无考试安排"}
      onRetry={exam.refresh}
      refreshing={exam.isRefetching}
      onRefresh={exam.refresh}
      fetchingHint={exam.isFetching && exam.hasData && !exam.isRefetching}
      search={
        exam.hasData
          ? {
              value: exam.draft,
              onChangeText: exam.setDraft,
              placeholder: "搜索课程、考场、时间…",
              searching: exam.searching,
            }
          : undefined
      }
    >
      <ExamScheduleList items={exam.filtered} />
    </JiaowuPageShell>
  );
}

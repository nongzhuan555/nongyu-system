import { useMemo } from "react";
import { getExamInfo } from "nongyu-tool-jiaowu";
import { useDeferredLocalSearch } from "@/modules/jiaowu/hooks/useDeferredLocalSearch";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { matchSearchQuery } from "@/modules/jiaowu/utils/search";

/**
 * 考试安排数据 + 本地搜索（教务页与课表内嵌共用）
 */
export function useExamSchedule() {
  const { data, isPending, isError, error, isFetching, isRefetching, refresh } = useJiaowuQuery({
    resource: "exam",
    requireAuth: true,
    queryFn: getExamInfo,
  });
  const { draft, setDraft, query, searching } = useDeferredLocalSearch();

  const list = data ?? [];
  const hasData = list.length > 0;
  const filtered = useMemo(
    () =>
      list.filter((item) =>
        matchSearchQuery(
          query,
          item.courseName,
          item.examRoom,
          item.examTime,
          item.assessmentMethod,
        ),
      ),
    [list, query],
  );
  const noSearchHit = hasData && !searching && query.trim().length > 0 && filtered.length === 0;

  return {
    data,
    list,
    filtered,
    hasData,
    noSearchHit,
    isPending,
    isError,
    error,
    isFetching,
    isRefetching,
    refresh,
    draft,
    setDraft,
    searching,
  };
}

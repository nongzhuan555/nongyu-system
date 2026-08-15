import { useCallback, useEffect, useRef, type RefObject } from "react";
import {
  FlatList,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from "react-native";
import { WeekGrid } from "./WeekGrid";
import type { CourseSizeScale } from "../model/coursePrefs";
import type { CourseEntry, ScheduleEntry, WeekGridData } from "../model/types";
import type { CourseDiffMode } from "../store/courseUiStore";
import type { DiffOverlayGrid } from "../model/courseShareDiff";

export type EmptyCellTarget = {
  weekIndex: number;
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startPeriod: number;
  endPeriod: number;
};

type WeekPagerProps = {
  weeks: WeekGridData[];
  pageWidth: number;
  pageHeight: number;
  rowHeight: number;
  fontScale: CourseSizeScale;
  initialIndex: number;
  viewWeekIndex: number;
  semesterStart: Date | null;
  highlightTodayColumn: boolean;
  onIndexChange: (index: number) => void;
  onCoursePress: (course: CourseEntry) => void;
  onSchedulePress: (schedule: ScheduleEntry) => void;
  onEmptyCellPress: (target: EmptyCellTarget) => void;
  listRef?: RefObject<FlatList<WeekGridData> | null>;
  readOnly?: boolean;
  /** 按周索引的 Diff 叠色；与 weeks 等长时启用 */
  diffOverlays?: DiffOverlayGrid[] | null;
  diffMode?: CourseDiffMode;
};

/**
 * 横向分页切周
 */
export function WeekPager({
  weeks,
  pageWidth,
  pageHeight,
  rowHeight,
  fontScale,
  initialIndex,
  viewWeekIndex,
  semesterStart,
  highlightTodayColumn,
  onIndexChange,
  onCoursePress,
  onSchedulePress,
  onEmptyCellPress,
  listRef,
  readOnly = false,
  diffOverlays = null,
  diffMode = "conflict",
}: WeekPagerProps) {
  const innerRef = useRef<FlatList<WeekGridData>>(null);
  const flatRef = listRef ?? innerRef;
  const maxWeek = weeks.length;
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current || weeks.length === 0 || pageWidth <= 0) return;
    didInit.current = true;
    const idx = Math.min(Math.max(0, initialIndex), weeks.length - 1);
    requestAnimationFrame(() => {
      try {
        flatRef.current?.scrollToIndex({ index: idx, animated: false });
      } catch {
        flatRef.current?.scrollToOffset({ offset: idx * pageWidth, animated: false });
      }
    });
  }, [flatRef, initialIndex, pageWidth, weeks.length]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / pageWidth);
      if (next !== viewWeekIndex) onIndexChange(next);
    },
    [onIndexChange, pageWidth, viewWeekIndex],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<WeekGridData>) => (
      <WeekGrid
        weekIndex={index}
        maxWeek={maxWeek}
        grid={item}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        rowHeight={rowHeight}
        fontScale={fontScale}
        semesterStart={semesterStart}
        highlightTodayColumn={highlightTodayColumn}
        onCoursePress={onCoursePress}
        onSchedulePress={onSchedulePress}
        onEmptyCellPress={onEmptyCellPress}
        readOnly={readOnly}
        diffOverlay={diffOverlays?.[index] ?? null}
        diffMode={diffMode}
      />
    ),
    [
      diffMode,
      diffOverlays,
      fontScale,
      highlightTodayColumn,
      maxWeek,
      onCoursePress,
      onSchedulePress,
      onEmptyCellPress,
      pageHeight,
      pageWidth,
      readOnly,
      rowHeight,
      semesterStart,
    ],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<WeekGridData> | null | undefined, index: number) => ({
      length: pageWidth,
      offset: pageWidth * index,
      index,
    }),
    [pageWidth],
  );

  if (weeks.length === 0) {
    return <View style={{ width: pageWidth, height: pageHeight }} />;
  }

  return (
    <FlatList
      ref={flatRef}
      data={weeks}
      keyExtractor={(_, i) => `week-${i}`}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      onMomentumScrollEnd={onMomentumEnd}
      initialNumToRender={3}
      windowSize={5}
      maxToRenderPerBatch={3}
      extraData={`${rowHeight}-${fontScale}-${readOnly}-${diffMode}-${diffOverlays ? "d" : "n"}`}
    />
  );
}

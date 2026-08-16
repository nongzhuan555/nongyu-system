import { memo, useCallback, useEffect, useRef, type RefObject } from "react";
import {
  FlatList,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from "react-native";
import { WeekGrid } from "./WeekGrid";
import type { CourseSizeScale } from "../model/coursePrefs";
import type { AttendanceStatus, CourseEntry, ScheduleEntry, WeekGridData } from "../model/types";
import type { CourseDiffMode } from "../store/courseUiStore";
import type { DiffOverlayGrid } from "../model/courseShareDiff";

export type EmptyCellTarget = {
  weekIndex: number;
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startPeriod: number;
  endPeriod: number;
};

type WeekPagerProps = {
  /** 与 maxWeek 等长；未构建周为 null */
  weeks: (WeekGridData | null)[];
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
  listRef?: RefObject<FlatList<WeekGridData | null> | null>;
  readOnly?: boolean;
  diffOverlays?: DiffOverlayGrid[] | null;
  diffMode?: CourseDiffMode;
  stackFrontIndex: Map<string, number>;
  onStackFrontIndexChange: (key: string, index: number) => void;
  /** 翻牌索引版本，驱动 FlatList extraData */
  stackFrontVersion?: number;
  /** 当前周 WeekGrid 首次 layout */
  onCurrentWeekLayout?: () => void;
  /** courseId:week:day → 本节考勤状态 */
  attendanceSessionBySlot?: Map<string, AttendanceStatus>;
  /** 中档铺满可视区、不纵向滚动 */
  fillViewport?: boolean;
};

/**
 * 横向分页切周（懒矩阵：null 周显示占位）
 * memo：打开详情弹层时父级 setState 不牵连整表网格重渲
 */
export const WeekPager = memo(function WeekPager({
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
  stackFrontIndex,
  onStackFrontIndexChange,
  stackFrontVersion = 0,
  onCurrentWeekLayout,
  attendanceSessionBySlot,
  fillViewport = false,
}: WeekPagerProps) {
  const innerRef = useRef<FlatList<WeekGridData | null>>(null);
  const flatRef = listRef ?? innerRef;
  const maxWeek = weeks.length;
  const didInit = useRef(false);
  const paintedRef = useRef(false);

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

  const handleLayout = useCallback(
    (index: number) => {
      if (paintedRef.current) return;
      if (index !== viewWeekIndex && index !== initialIndex) return;
      if (!weeks[index]) return;
      paintedRef.current = true;
      onCurrentWeekLayout?.();
    },
    [initialIndex, onCurrentWeekLayout, viewWeekIndex, weeks],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<WeekGridData | null>) => (
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
        stackFrontIndex={stackFrontIndex}
        onStackFrontIndexChange={onStackFrontIndexChange}
        onGridLayout={() => handleLayout(index)}
        attendanceSessionBySlot={attendanceSessionBySlot}
        fillViewport={fillViewport}
      />
    ),
    [
      attendanceSessionBySlot,
      diffMode,
      diffOverlays,
      fillViewport,
      fontScale,
      handleLayout,
      highlightTodayColumn,
      maxWeek,
      onCoursePress,
      onSchedulePress,
      onEmptyCellPress,
      onStackFrontIndexChange,
      pageHeight,
      pageWidth,
      readOnly,
      rowHeight,
      semesterStart,
      stackFrontIndex,
    ],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<WeekGridData | null> | null | undefined, index: number) => ({
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
      extraData={`${rowHeight}-${fontScale}-${readOnly}-${diffMode}-${viewWeekIndex}-${stackFrontVersion}-s${attendanceSessionBySlot?.size ?? 0}-f${fillViewport ? 1 : 0}`}
    />
  );
});

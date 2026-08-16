import { useThemeTokens } from "@/theme/ThemeProvider";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StackedCellCard } from "./StackedCellCard";
import { CellActionSheet } from "./CellActionSheet";
import { COURSE_TIMES, MAJOR_SLOT_COUNT, WEEKDAY_LABELS } from "../model/courseTimes";
import { COURSE_ROW_HEIGHT, type CourseSizeScale } from "../model/coursePrefs";
import { formatMonthDay, getMondayOfWeek, isSameCalendarDay } from "../model/semesterWeek";
import type {
  AttendanceStatus,
  CourseEntry,
  ScheduleEntry,
  StackItem,
  WeekGridData,
} from "../model/types";
import type { CourseDiffMode } from "../store/courseUiStore";
import type { DiffCellKind, DiffOverlayGrid } from "../model/courseShareDiff";
import type { EmptyCellTarget } from "./WeekPager";
import { createThemedStyles } from "@/theme/createThemedStyles";

const TIME_COL_WIDTH = 36;
/** 与 styles.row.marginBottom 一致，连堂加高时计入行缝 */
const ROW_GAP = 2;

const DIFF_COLORS: Record<DiffCellKind, string> = {
  onlyMine: "rgba(37, 99, 235, 0.35)",
  onlyPeer: "rgba(234, 88, 12, 0.35)",
  both: "rgba(220, 38, 38, 0.4)",
  neither: "rgba(22, 163, 74, 0.35)",
};

type WeekGridProps = {
  weekIndex: number;
  maxWeek: number;
  grid: WeekGridData | null;
  pageWidth: number;
  pageHeight: number;
  rowHeight: number;
  fontScale: CourseSizeScale;
  semesterStart: Date | null;
  highlightTodayColumn: boolean;
  onCoursePress: (course: CourseEntry) => void;
  onSchedulePress: (schedule: ScheduleEntry) => void;
  onEmptyCellPress: (target: EmptyCellTarget) => void;
  /** 只读：空格不可添加、无长按 */
  readOnly?: boolean;
  diffOverlay?: DiffOverlayGrid | null;
  diffMode?: CourseDiffMode;
  /** 堆叠正面索引（由父级持有，切周清空） */
  stackFrontIndex: Map<string, number>;
  onStackFrontIndexChange: (key: string, index: number) => void;
  /** 当前周首次 layout（首屏埋点） */
  onGridLayout?: () => void;
  /** courseId:week:day → 本节状态 */
  attendanceSessionBySlot?: Map<string, AttendanceStatus>;
  /**
   * 中档：按可视区均分 5 行高度，末行贴底栏上方且不出现纵向滚动
   * 大档仍用固定 rowHeight + 可滚动
   */
  fillViewport?: boolean;
};

function stackKey(weekIndex: number, day: number, startRow: number): string {
  return `${weekIndex}:${day}:${startRow}`;
}

/**
 * 单周课表网格（stack 叠卡 + Diff 叠色）
 */
export function WeekGrid({
  weekIndex,
  maxWeek,
  grid,
  pageWidth,
  pageHeight,
  rowHeight,
  fontScale,
  semesterStart,
  highlightTodayColumn,
  onCoursePress,
  onSchedulePress,
  onEmptyCellPress,
  readOnly = false,
  diffOverlay = null,
  diffMode = "conflict",
  stackFrontIndex,
  onStackFrontIndexChange,
  onGridLayout,
  attendanceSessionBySlot,
  fillViewport = false,
}: WeekGridProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const weekNumber = weekIndex + 1;
  const today = useMemo(() => new Date(), []);
  const [actionTarget, setActionTarget] = useState<EmptyCellTarget | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const overlayColor = (kind: DiffCellKind | undefined): string | undefined => {
    if (!kind || !diffOverlay) return undefined;
    if (diffMode === "free") {
      return kind === "neither" ? DIFF_COLORS.neither : "rgba(15, 23, 42, 0.06)";
    }
    if (kind === "neither") return undefined;
    return DIFF_COLORS[kind];
  };

  const monday = useMemo(() => {
    if (!semesterStart) return null;
    return getMondayOfWeek(weekNumber, semesterStart);
  }, [semesterStart, weekNumber]);

  const dayDates = useMemo(() => {
    if (!monday) return null;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [monday]);

  const cellWidth = (pageWidth - 8 - TIME_COL_WIDTH) / 7;
  const todayWash = `${t.color.brandMuted}40`;

  const effectiveRowHeight = useMemo(() => {
    if (!fillViewport || headerHeight <= 0) return rowHeight;
    const gaps = ROW_GAP * (MAJOR_SLOT_COUNT - 1);
    const usable = pageHeight - headerHeight - gaps;
    // 留约 1% 余量，避免末行被悬浮 Tab 轻微遮挡，同时与小档拉开视觉差距
    return Math.max(72, Math.floor((usable * 0.99) / MAJOR_SLOT_COUNT));
  }, [fillViewport, headerHeight, pageHeight, rowHeight]);

  /** 仅大卡片需要额外滚到底留白；中/小维持无额外 padding */
  const scrollBottomPad =
    !fillViewport && rowHeight >= COURSE_ROW_HEIGHT.lg ? t.space.xl + t.tabBar.heightMax * 0.35 : 0;

  const handleEmptyPress = (rIdx: number, cIdx: number) => {
    const startPeriod = rIdx * 2 + 1;
    const endPeriod = startPeriod + 1;
    onEmptyCellPress({
      weekIndex,
      day: (cIdx + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      startPeriod,
      endPeriod,
    });
  };

  const spanCardHeight = (span: number) => effectiveRowHeight * span + ROW_GAP * (span - 1) - 4;

  const openDetail = (item: StackItem) => {
    if (item.type === "course") onCoursePress(item.course);
    else onSchedulePress(item.schedule);
  };

  if (!grid) {
    return (
      <View style={{ width: pageWidth, height: pageHeight }} onLayout={onGridLayout}>
        <View style={styles.grid}>
          <View style={styles.headerRow}>
            <View style={[styles.headerCell, styles.timeCell]}>
              <Text style={styles.headerWeekText}>第{weekNumber}周</Text>
              <Text style={styles.headerWeekSub}>共{maxWeek}周</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: pageWidth, height: pageHeight }} onLayout={onGridLayout}>
      <View style={styles.grid}>
        <View
          style={styles.headerRow}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setHeaderHeight((prev) => (Math.abs(prev - h) < 0.5 ? prev : h));
          }}
        >
          <View style={[styles.headerCell, styles.timeCell]}>
            <Text style={styles.headerWeekText}>第{weekNumber}周</Text>
            <Text style={styles.headerWeekSub}>共{maxWeek}周</Text>
          </View>
          {WEEKDAY_LABELS.map((label, i) => {
            const date = dayDates?.[i];
            const isToday = Boolean(date && isSameCalendarDay(date, today));
            const emphasize = isToday && highlightTodayColumn;
            return (
              <View
                key={label}
                style={[
                  styles.headerCell,
                  { width: cellWidth },
                  emphasize && { backgroundColor: todayWash, borderRadius: 8 },
                ]}
              >
                <Text style={[styles.headerText, isToday && styles.headerToday]}>{label}</Text>
                {date ? (
                  <Text style={[styles.dateText, isToday && styles.headerToday]}>
                    {formatMonthDay(date)}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={
            scrollBottomPad > 0 ? { paddingBottom: scrollBottomPad } : undefined
          }
          nestedScrollEnabled
          scrollEnabled={!fillViewport}
          showsVerticalScrollIndicator={!fillViewport}
        >
          {grid.map((row, rIdx) => {
            const rowSpanBoost = row.some((c) => c?.kind === "stack" && c.spanRows > 1);
            const isLastRow = rIdx === grid.length - 1;
            return (
              <View
                key={rIdx}
                style={[
                  styles.row,
                  {
                    minHeight: effectiveRowHeight,
                    marginBottom: isLastRow ? 0 : ROW_GAP,
                    zIndex: rowSpanBoost ? 4 : 1,
                    elevation: rowSpanBoost ? 4 : 0,
                  },
                ]}
              >
                <View style={[styles.cell, styles.timeCell, { height: effectiveRowHeight }]}>
                  <View style={styles.timeSlot}>
                    <Text style={styles.timeValue}>{COURSE_TIMES[rIdx * 2]?.start}</Text>
                    <Text style={styles.timeIndex}>{rIdx * 2 + 1}</Text>
                    <Text style={styles.timeValue}>{COURSE_TIMES[rIdx * 2]?.end}</Text>
                  </View>
                  <View style={styles.timeSlot}>
                    <Text style={styles.timeValue}>{COURSE_TIMES[rIdx * 2 + 1]?.start}</Text>
                    <Text style={styles.timeIndex}>{rIdx * 2 + 2}</Text>
                    <Text style={styles.timeValue}>{COURSE_TIMES[rIdx * 2 + 1]?.end}</Text>
                  </View>
                </View>

                {row.map((cell, cIdx) => {
                  const tint = overlayColor(diffOverlay?.[rIdx]?.[cIdx]);
                  const tintStyle = tint ? { backgroundColor: tint, borderRadius: 6 } : null;

                  if (cell?.kind === "occupied") {
                    return (
                      <View
                        key={cIdx}
                        pointerEvents="none"
                        style={[
                          styles.cell,
                          { width: cellWidth, height: effectiveRowHeight },
                          tintStyle,
                        ]}
                      />
                    );
                  }
                  if (cell?.kind === "stack") {
                    const span = cell.spanRows;
                    const cardHeight = spanCardHeight(span);
                    const day = (cIdx + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
                    const key = stackKey(weekIndex, day, rIdx);
                    const front = stackFrontIndex.get(key) ?? 0;
                    const startPeriod = rIdx * 2 + 1;
                    const endPeriod = startPeriod + span * 2 - 1;
                    return (
                      <View
                        key={cIdx}
                        style={[
                          styles.cell,
                          styles.spanHost,
                          {
                            width: cellWidth,
                            height: effectiveRowHeight,
                            zIndex: span > 1 ? 2 : 1,
                          },
                          tintStyle,
                        ]}
                      >
                        <StackedCellCard
                          items={cell.items}
                          height={cardHeight}
                          fontScale={fontScale}
                          frontIndex={front}
                          onFrontIndexChange={(index) => onStackFrontIndexChange(key, index)}
                          onOpenDetail={openDetail}
                          attendanceSessionBySlot={attendanceSessionBySlot}
                          weekNumber={weekNumber}
                          onLongPressAdd={
                            readOnly
                              ? undefined
                              : () =>
                                  setActionTarget({
                                    weekIndex,
                                    day,
                                    startPeriod,
                                    endPeriod: Math.min(10, endPeriod),
                                  })
                          }
                        />
                      </View>
                    );
                  }
                  if (readOnly) {
                    return (
                      <View
                        key={cIdx}
                        style={[
                          styles.cell,
                          styles.emptyCell,
                          { width: cellWidth, height: effectiveRowHeight },
                          tintStyle,
                        ]}
                      />
                    );
                  }
                  return (
                    <Pressable
                      key={cIdx}
                      onPress={() => handleEmptyPress(rIdx, cIdx)}
                      style={({ pressed }) => [
                        styles.cell,
                        styles.emptyCell,
                        { width: cellWidth, height: effectiveRowHeight },
                        tintStyle,
                        pressed && styles.emptyCellPressed,
                      ]}
                    />
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {!readOnly ? (
        <CellActionSheet
          visible={actionTarget != null}
          onClose={() => setActionTarget(null)}
          onAddSchedule={() => {
            if (actionTarget) onEmptyCellPress(actionTarget);
          }}
        />
      ) : null}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  grid: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  /** 表头之外的纵向滚动区，占满剩余高度 */
  scroll: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "transparent",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
  },
  headerCell: {
    paddingVertical: 10,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cell: {
    padding: 2,
    justifyContent: "flex-start",
    overflow: "visible",
  },
  spanHost: {
    justifyContent: "flex-start",
  },
  timeCell: {
    width: TIME_COL_WIDTH,
    paddingHorizontal: 0,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timeIndex: {
    fontSize: 13,
    fontWeight: "700",
    color: t.color.textSecondary,
    lineHeight: 16,
    marginVertical: 2,
  },
  timeValue: {
    fontSize: 9,
    color: t.color.textSecondary,
    opacity: 0.6,
    transform: [{ scale: 0.85 }],
    lineHeight: 10,
  },
  headerText: {
    fontSize: 12,
    fontWeight: "600",
    color: t.color.textSecondary,
    textAlign: "center",
  },
  headerWeekText: {
    fontSize: 10,
    fontWeight: "700",
    color: t.color.textSecondary,
  },
  headerWeekSub: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 2,
    color: t.color.textSecondary,
  },
  dateText: {
    fontSize: 11,
    opacity: 0.8,
    marginTop: 2,
    color: t.color.textSecondary,
  },
  headerToday: {
    color: t.color.brand,
    fontWeight: "700",
  },
  emptyCell: {
    borderRadius: 6,
  },
  emptyCellPressed: {
    backgroundColor: `${t.color.brandMuted}50`,
  },
}));

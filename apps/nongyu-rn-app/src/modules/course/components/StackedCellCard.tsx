import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { CourseCard } from "./CourseCard";
import { ScheduleCard } from "./ScheduleCard";
import type { CourseSizeScale } from "../model/coursePrefs";
import { attendanceSlotKey, formatCardSessionLabel } from "../model/attendanceSummary";
import type { AttendanceStatus, StackItem } from "../model/types";
import { createThemedStyles } from "@/theme/createThemedStyles";

type StackedCellCardProps = {
  items: StackItem[];
  height: number;
  fontScale: CourseSizeScale;
  frontIndex: number;
  onFrontIndexChange: (index: number) => void;
  onOpenDetail: (item: StackItem) => void;
  /** 单卡时长按：添加日程菜单；多卡时长按用于翻牌 */
  onLongPressAdd?: () => void;
  /** courseId:week:day → 本节状态（卡片仅展示本节，不展示学期汇总） */
  attendanceSessionBySlot?: Map<string, AttendanceStatus>;
  /** 当前教学周（1-based），用于解析本节考勤 */
  weekNumber: number;
};

/**
 * 同格堆叠宿主：单击开详情；多卡长按翻牌+震动；单卡长按添加日程
 */
export function StackedCellCard({
  items,
  height,
  fontScale,
  frontIndex,
  onFrontIndexChange,
  onOpenDetail,
  onLongPressAdd,
  attendanceSessionBySlot,
  weekNumber,
}: StackedCellCardProps) {
  const styles = useStyles();
  const safeIndex =
    items.length === 0 ? 0 : ((frontIndex % items.length) + items.length) % items.length;
  const [displayIndex, setDisplayIndex] = useState(safeIndex);
  const rotateY = useSharedValue(0);
  const flippingRef = useRef(false);

  useEffect(() => {
    setDisplayIndex(safeIndex);
  }, [safeIndex]);

  const openDetail = useCallback(() => {
    const item = items[displayIndex];
    if (item) onOpenDetail(item);
  }, [displayIndex, items, onOpenDetail]);

  const markFlipDone = useCallback(() => {
    flippingRef.current = false;
  }, []);

  const flipToNext = useCallback(() => {
    if (items.length <= 1 || flippingRef.current) return;
    flippingRef.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = (displayIndex + 1) % items.length;
    rotateY.value = withTiming(
      90,
      { duration: 125, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (!finished) {
          runOnJS(markFlipDone)();
          return;
        }
        runOnJS(setDisplayIndex)(next);
        runOnJS(onFrontIndexChange)(next);
        rotateY.value = -90;
        rotateY.value = withTiming(0, { duration: 125, easing: Easing.out(Easing.cubic) }, () => {
          runOnJS(markFlipDone)();
        });
      },
    );
  }, [displayIndex, items.length, markFlipDone, onFrontIndexChange, rotateY]);

  const onLongPress = useCallback(() => {
    if (items.length > 1) {
      flipToNext();
      return;
    }
    onLongPressAdd?.();
  }, [flipToNext, items.length, onLongPressAdd]);

  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((_e, success) => {
      if (!success) return;
      runOnJS(openDetail)();
    });

  const longPress = Gesture.LongPress()
    .minDuration(420)
    .onStart(() => {
      runOnJS(onLongPress)();
    });

  const composed = Gesture.Exclusive(longPress, singleTap);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${rotateY.value}deg` }],
  }));

  const item = items[displayIndex];
  if (!item) return null;

  const attendanceLine =
    item.type === "course"
      ? formatCardSessionLabel(
          attendanceSessionBySlot?.get(
            attendanceSlotKey(item.course.id, weekNumber, item.course.day),
          ),
        )
      : null;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.host, { height }, animStyle]}>
        {item.type === "course" ? (
          <CourseCard
            course={item.course}
            height={height}
            fontScale={fontScale}
            attendanceSummary={attendanceLine}
          />
        ) : (
          <ScheduleCard schedule={item.schedule} height={height} fontScale={fontScale} />
        )}
        {items.length > 1 ? (
          <View style={styles.badge} pointerEvents="none">
            <Text style={styles.badgeText}>
              {displayIndex + 1}/{items.length}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const useStyles = createThemedStyles((t) => ({
  host: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  badge: {
    position: "absolute",
    right: 3,
    bottom: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: `${t.color.text}66`,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: t.color.surface,
  },
}));

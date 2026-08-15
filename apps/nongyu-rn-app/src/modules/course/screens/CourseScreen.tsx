import { useThemeTokens } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { type BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackToCurrentWeekFab } from "../components/BackToCurrentWeekFab";
import { CourseDetailSheet } from "../components/CourseDetailSheet";
import { CourseDiffLegend } from "../components/CourseDiffLegend";
import { PeerLookupSheet } from "../components/PeerLookupSheet";
import { ScheduleFormSheet } from "../components/ScheduleFormSheet";
import { SemesterStartPicker } from "../components/SemesterStartPicker";
import { WeekPager, type EmptyCellTarget } from "../components/WeekPager";
import { fetchAndPersistCourses, loadCourses } from "../data/courseRepository";
import { lookupPeer } from "../data/courseShareRepository";
import { AppApiError } from "@/api/appApiError";
import { COURSE_ROW_HEIGHT } from "../model/coursePrefs";
import { buildDiffOverlay } from "../model/courseShareDiff";
import { mergeAdjacentCourseEntries } from "../model/mapJiaowuCourseItems";
import { computeCurrentWeek } from "../model/semesterWeek";
import {
  buildAllWeekMatrices,
  buildAllWeekMatricesWithSchedules,
  buildWeekGrid,
  maxWeekFromCourses,
} from "../model/weekMatrix";
import type { CourseEntry, ScheduleEntry, WeekGridData } from "../model/types";
import { useCourseUiStore } from "../store/courseUiStore";
import { useCourseExt } from "../hooks/useCourseExt";
import { newCourseExtId } from "../model/genId";
import { TabScreenBackground } from "@/components/navigation/TabScreenBackground";
import { toast } from "@/components/ui/toast";
import { useSessionStore } from "@/stores/session";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 课表主屏：本地优先；无本地才抓教务；仅用户点刷新强制同步
 * 页头布局对齐旧版 Course（标题 + tonal 图标按钮）
 */
export function CourseScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const queryClient = useQueryClient();
  const sheetRef = useRef<BottomSheetModal>(null);
  const scheduleFormRef = useRef<BottomSheetModal>(null);
  const listRef = useRef<FlatList<WeekGridData>>(null);

  const studentId = useSessionStore((s) => s.profile?.studentId);
  const semesterStartMs = useCourseUiStore((s) => s.semesterStartMs);
  const highlightTodayColumn = useCourseUiStore((s) => s.highlightTodayColumn);
  const backgroundUri = useCourseUiStore((s) => s.backgroundUri);
  const cardSize = useCourseUiStore((s) => s.cardSize);
  const fontSize = useCourseUiStore((s) => s.fontSize);
  const viewWeekIndex = useCourseUiStore((s) => s.viewWeekIndex);
  const viewMode = useCourseUiStore((s) => s.viewMode);
  const peer = useCourseUiStore((s) => s.peer);
  const diffMode = useCourseUiStore((s) => s.diffMode);
  const weekPinned = useCourseUiStore((s) => s.weekPinned);
  const setSemesterStart = useCourseUiStore((s) => s.setSemesterStart);
  const setViewWeekIndex = useCourseUiStore((s) => s.setViewWeekIndex);
  const enterPeerView = useCourseUiStore((s) => s.enterPeerView);
  const enterDiffView = useCourseUiStore((s) => s.enterDiffView);
  const setDiffMode = useCourseUiStore((s) => s.setDiffMode);
  const exitPeerView = useCourseUiStore((s) => s.exitPeerView);

  const rowHeight = COURSE_ROW_HEIGHT[cardSize];

  const [pickerVisible, setPickerVisible] = useState(false);
  const [peerLookupVisible, setPeerLookupVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseEntry | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEntry | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<EmptyCellTarget | null>(null);
  const [forceRefreshing, setForceRefreshing] = useState(false);

  const isPeerMode = viewMode === "peer" || viewMode === "diff";
  const isDiffMode = viewMode === "diff";
  const readOnly = isPeerMode;

  const queryKey = useMemo(() => ["jiaowu", "course", studentId ?? ""] as const, [studentId]);

  const { data, isPending, isError, error } = useQuery({
    queryKey,
    enabled: !!studentId,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    queryFn: async () => {
      const res = await loadCourses(studentId!);
      if (!res.success) {
        throw new Error(res.message || "课表获取失败");
      }
      return res.courses;
    },
  });

  const forceRefresh = useCallback(async () => {
    if (!studentId) return;
    setForceRefreshing(true);
    try {
      const res = await fetchAndPersistCourses(studentId);
      if (!res.success) {
        toast.error("刷新失败", {
          description: res.message || "已保留本地课表",
        });
        return;
      }
      queryClient.setQueryData(queryKey, res.courses);
      if (res.shareSyncWarning) {
        toast.error("共享同步失败", { description: res.shareSyncWarning });
      } else {
        toast.success("课表已更新");
      }
    } finally {
      setForceRefreshing(false);
    }
  }, [queryClient, queryKey, studentId]);

  const courses = useMemo(() => mergeAdjacentCourseEntries(data ?? []), [data]);
  const {
    schedules,
    notes,
    todos,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    createNote,
    deleteNote,
    createTodo,
    updateTodo,
    deleteTodo,
  } = useCourseExt();
  const loading = !!studentId && isPending && !data;
  const showError = isError && !data;

  const displayCourses = isPeerMode && peer ? peer.courses : courses;
  const displaySchedules = readOnly ? [] : schedules;

  const semesterStart = useMemo(
    () => (semesterStartMs != null ? new Date(semesterStartMs) : null),
    [semesterStartMs],
  );

  const weeks = useMemo(() => {
    if (isDiffMode && peer) {
      const maxW = Math.max(maxWeekFromCourses(courses), maxWeekFromCourses(peer.courses), 1);
      return Array.from({ length: maxW }, (_, i) => buildWeekGrid(i + 1, peer.courses));
    }
    if (readOnly) return buildAllWeekMatrices(displayCourses);
    return buildAllWeekMatricesWithSchedules(displayCourses, displaySchedules);
  }, [courses, displayCourses, displaySchedules, isDiffMode, peer, readOnly]);

  const diffOverlays = useMemo(() => {
    if (!isDiffMode || !peer) return null;
    return weeks.map((_, i) => buildDiffOverlay(i + 1, courses, peer.courses));
  }, [courses, isDiffMode, peer, weeks]);
  const maxWeek = Math.max(1, weeks.length);

  const currentWeekIndex = useMemo(() => {
    if (!semesterStart) return 0;
    const w = computeCurrentWeek(semesterStart);
    return Math.min(Math.max(0, w - 1), maxWeek - 1);
  }, [maxWeek, semesterStart]);

  useEffect(() => {
    if (loading || weeks.length === 0) return;
    if (weekPinned) return;
    setViewWeekIndex(currentWeekIndex);
  }, [currentWeekIndex, loading, setViewWeekIndex, weekPinned, weeks.length]);

  useEffect(() => {
    if (loading || weeks.length === 0 || !semesterStart) return;
    const index = weekPinned ? viewWeekIndex : currentWeekIndex;
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex({ index, animated: true });
      } catch {
        listRef.current?.scrollToOffset({
          offset: index * width,
          animated: true,
        });
      }
    });
  }, [currentWeekIndex, loading, semesterStart, weekPinned, weeks.length, width]);

  const pageHeight = useMemo(() => {
    const top = insets.top + 52;
    const bottom = insets.bottom + t.tabBar.bottomGapMax + t.tabBar.heightMax + 12;
    return Math.max(320, height - top - bottom);
  }, [height, insets.bottom, insets.top]);

  const openDetail = useCallback((course: CourseEntry) => {
    setSelectedCourse(course);
    sheetRef.current?.present();
  }, []);

  const onLookupPeer = useCallback(
    async (studentNo: string) => {
      try {
        const result = await lookupPeer(studentNo);
        enterPeerView({
          studentNo: result.studentNo,
          courses: result.courses,
          updatedAt: result.updatedAt,
        });
        toast.success(`正在查看 ${result.studentNo} 的课表`);
      } catch (err) {
        if (err instanceof AppApiError) {
          throw new Error(err.message);
        }
        throw new Error(err instanceof Error ? err.message : "查找失败");
      }
    },
    [enterPeerView],
  );

  // M4: 备注/待办
  const onAddNote = useCallback(
    async (content: string) => {
      if (readOnly || !studentId || !selectedCourse) return;
      const now = new Date().toISOString();
      await createNote({
        id: newCourseExtId(),
        studentId,
        courseId: selectedCourse.id,
        content,
        createdAt: now,
        updatedAt: now,
      });
    },
    [createNote, readOnly, selectedCourse, studentId],
  );

  const onAddTodo = useCallback(
    async (content: string) => {
      if (readOnly || !studentId || !selectedCourse) return;
      const now = new Date().toISOString();
      await createTodo({
        id: newCourseExtId(),
        studentId,
        courseId: selectedCourse.id,
        content,
        status: "pending",
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    },
    [createTodo, readOnly, selectedCourse, studentId],
  );

  const onToggleTodo = useCallback(
    async (id: string, status: "pending" | "done") => {
      if (readOnly || !studentId) return;
      await updateTodo({
        id,
        patch: {
          status,
          completedAt: status === "done" ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        },
      });
    },
    [readOnly, studentId, updateTodo],
  );

  // M4: 日程表单
  const openScheduleDetail = useCallback(
    (schedule: ScheduleEntry) => {
      if (readOnly) return;
      setEditingSchedule(schedule);
      setScheduleTarget(null);
      scheduleFormRef.current?.present();
    },
    [readOnly],
  );

  const openScheduleForm = useCallback(
    (target: EmptyCellTarget) => {
      if (readOnly) return;
      setEditingSchedule(null);
      setScheduleTarget(target);
      scheduleFormRef.current?.present();
    },
    [readOnly],
  );

  const onSubmitSchedule = useCallback(
    async (entry: ScheduleEntry) => {
      if (!studentId) return;
      if (editingSchedule) {
        await updateSchedule({
          id: entry.id,
          patch: {
            title: entry.title,
            content: entry.content,
            location: entry.location,
            day: entry.day,
            startPeriod: entry.startPeriod,
            endPeriod: entry.endPeriod,
            weeksList: entry.weeksList,
            updatedAt: entry.updatedAt,
          },
        });
      } else {
        await createSchedule(entry);
      }
      scheduleFormRef.current?.dismiss();
    },
    [createSchedule, editingSchedule, studentId, updateSchedule],
  );

  const onDeleteSchedule = useCallback(
    async (id: string) => {
      if (!studentId) return;
      await deleteSchedule(id);
      scheduleFormRef.current?.dismiss();
    },
    [deleteSchedule, studentId],
  );

  const onDismissScheduleForm = useCallback(() => {
    setEditingSchedule(null);
    setScheduleTarget(null);
  }, []);

  const onDismissDetail = useCallback(() => {
    setSelectedCourse(null);
  }, []);

  /** 弹层打开时硬件返回优先关闭弹层，不交给导航/其它逻辑 */
  useEffect(() => {
    const scheduleOpen = editingSchedule != null || scheduleTarget != null;
    const detailOpen = selectedCourse != null;
    if (!scheduleOpen && !detailOpen) return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (scheduleOpen) {
        scheduleFormRef.current?.dismiss();
        return true;
      }
      if (detailOpen) {
        sheetRef.current?.dismiss();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [editingSchedule, scheduleTarget, selectedCourse]);

  const goCurrentWeek = useCallback(() => {
    setViewWeekIndex(currentWeekIndex);
    try {
      listRef.current?.scrollToIndex({ index: currentWeekIndex, animated: true });
    } catch {
      listRef.current?.scrollToOffset({
        offset: currentWeekIndex * width,
        animated: true,
      });
    }
  }, [currentWeekIndex, setViewWeekIndex, width]);

  const showBackFab =
    Boolean(semesterStart) && viewWeekIndex !== currentWeekIndex && !loading && !showError;

  const pickerInitial = semesterStart ?? new Date();

  return (
    <View style={styles.root}>
      {backgroundUri ? (
        <>
          <Image
            source={{ uri: backgroundUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            pointerEvents="none"
          />
          <View style={styles.bgScrim} pointerEvents="none" />
        </>
      ) : (
        <TabScreenBackground />
      )}

      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {isPeerMode && peer ? `查看 ${peer.studentNo}` : "农屿课程表"}
          </Text>
          {isPeerMode && peer ? (
            <Text style={styles.subTitle} numberOfLines={1}>
              更新于 {peer.updatedAt.slice(0, 16).replace("T", " ")}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          {isPeerMode ? (
            <>
              {isDiffMode ? (
                <Pressable
                  onPress={() => {
                    if (peer) enterPeerView(peer);
                  }}
                  style={({ pressed }) => [styles.exitDiffBtn, pressed && styles.iconBtnPressed]}
                  accessibilityLabel="退出对比"
                >
                  <Text style={styles.exitDiffText}>退出对比</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => enterDiffView()}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                  accessibilityLabel="对比课表"
                >
                  <Ionicons name="git-compare-outline" size={20} color={t.color.brand} />
                </Pressable>
              )}
              <Pressable
                onPress={() => exitPeerView()}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                accessibilityLabel="返回我的课表"
              >
                <Ionicons name="arrow-undo-outline" size={20} color={t.color.brand} />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => setPeerLookupVisible(true)}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                accessibilityLabel="查看他人课表"
                disabled={!studentId}
              >
                <Ionicons name="people-outline" size={20} color={t.color.brand} />
              </Pressable>
              <Pressable
                onPress={() => void forceRefresh()}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                accessibilityLabel="强制刷新课表"
                disabled={!studentId || forceRefreshing}
              >
                {forceRefreshing ? (
                  <ActivityIndicator size="small" color={t.color.brand} />
                ) : (
                  <Ionicons name="refresh" size={20} color={t.color.brand} />
                )}
              </Pressable>
              <Pressable
                onPress={() => router.push("/mine/settings/course" as Href)}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                accessibilityLabel="课表设置"
              >
                <Ionicons name="settings-outline" size={20} color={t.color.brand} />
              </Pressable>
              <Pressable
                onPress={() => setPickerVisible(true)}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                accessibilityLabel="设置开学日期"
              >
                <Ionicons name="calendar-outline" size={20} color={t.color.brand} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {isDiffMode ? <CourseDiffLegend mode={diffMode} onModeChange={setDiffMode} /> : null}

      {!studentId ? (
        <View style={styles.loading}>
          <Text style={styles.hint}>登录后加载课表</Text>
        </View>
      ) : loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={t.color.brand} size="large" />
        </View>
      ) : showError ? (
        <View style={styles.loading}>
          <Text style={styles.errorTitle}>获取课表失败</Text>
          <Text style={styles.hint}>
            {error instanceof Error ? error.message : "请检查网络后重试"}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.9 }]}
            onPress={() => void forceRefresh()}
          >
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      ) : (
        <WeekPager
          weeks={weeks}
          pageWidth={width}
          pageHeight={pageHeight}
          rowHeight={rowHeight}
          fontScale={fontSize}
          initialIndex={weekPinned ? viewWeekIndex : currentWeekIndex}
          viewWeekIndex={viewWeekIndex}
          semesterStart={semesterStart}
          highlightTodayColumn={highlightTodayColumn}
          onIndexChange={setViewWeekIndex}
          onCoursePress={openDetail}
          onSchedulePress={openScheduleDetail}
          onEmptyCellPress={openScheduleForm}
          listRef={listRef}
          readOnly={readOnly}
          diffOverlays={diffOverlays}
          diffMode={diffMode}
        />
      )}

      <BackToCurrentWeekFab
        visible={showBackFab}
        onPress={goCurrentWeek}
        topOffset={insets.top + 56}
      />

      <CourseDetailSheet
        ref={sheetRef}
        course={selectedCourse}
        notes={readOnly ? [] : notes}
        todos={readOnly ? [] : todos}
        onAddNote={onAddNote}
        onDeleteNote={readOnly ? async () => undefined : deleteNote}
        onAddTodo={onAddTodo}
        onToggleTodo={onToggleTodo}
        onDeleteTodo={readOnly ? async () => undefined : deleteTodo}
        onDismiss={onDismissDetail}
        readOnly={readOnly}
      />

      {!readOnly ? (
        <ScheduleFormSheet
          ref={scheduleFormRef}
          schedule={editingSchedule}
          target={scheduleTarget}
          studentId={studentId ?? ""}
          onSubmit={onSubmitSchedule}
          onDelete={onDeleteSchedule}
          onDismiss={onDismissScheduleForm}
        />
      ) : null}

      <PeerLookupSheet
        visible={peerLookupVisible}
        onClose={() => setPeerLookupVisible(false)}
        onSubmit={onLookupPeer}
      />

      <SemesterStartPicker
        visible={pickerVisible}
        initialDate={pickerInitial}
        onDismiss={() => setPickerVisible(false)}
        onConfirm={(date) => {
          setSemesterStart(date);
          setPickerVisible(false);
        }}
      />
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  bgScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: t.color.background,
    opacity: 0.72,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: t.color.text,
  },
  titleBlock: {
    flex: 1,
    marginRight: 8,
  },
  subTitle: {
    fontSize: 11,
    color: t.color.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 4,
    flexShrink: 0,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.brandMuted,
  },
  exitDiffBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.brandMuted,
  },
  exitDiffText: {
    fontSize: 13,
    fontWeight: "700",
    color: t.color.brand,
  },
  iconBtnPressed: {
    opacity: 0.75,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.space.lg,
    gap: 12,
  },
  hint: {
    fontSize: 14,
    color: t.color.textSecondary,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: t.color.text,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: t.radius.md,
    backgroundColor: t.color.brand,
  },
  retryText: {
    color: t.color.onBrand,
    fontWeight: "600",
  },
}));

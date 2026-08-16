import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { COURSE_TIMES, WEEKDAY_LABELS } from "../model/courseTimes";
import type {
  AttendanceStatus,
  CourseAttendance,
  CourseEntry,
  CourseNote,
  CourseTodo,
} from "../model/types";
import { CourseAttendanceSection } from "./CourseAttendanceSection";
import { CourseDetailExtensionsSkeleton } from "./CourseSkeletons";
import { confirm } from "@/components/ui/confirm";
import { toast } from "@/components/ui/toast";
import { lightTokens } from "@/theme/tokens";

/** 备注/待办列表限高，超出局部滚动 */
const LIST_MAX_HEIGHT = 200;

type CourseDetailSheetProps = {
  course: CourseEntry | null;
  notes: CourseNote[];
  todos: CourseTodo[];
  weekNumber: number;
  attendance: CourseAttendance | null;
  /** 本门课全学期考勤记录 */
  courseAttendances?: CourseAttendance[];
  onAddNote: (content: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onAddTodo: (content: string) => Promise<void>;
  onToggleTodo: (id: string, status: "pending" | "done") => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
  onUpsertAttendance: (status: AttendanceStatus) => Promise<void>;
  onClearAttendance: () => Promise<void>;
  onAddScheduleHere?: () => void;
  onDismiss: () => void;
  /** 查看他人 / Diff：只渲染基本信息，不出现备注待办等扩展区 */
  readOnly?: boolean;
};

function formatPeriods(course: CourseEntry): string {
  const start = COURSE_TIMES[course.startPeriod - 1];
  const end = COURSE_TIMES[course.endPeriod - 1];
  const clock =
    start && end ? `${start.start}-${end.end}` : `${course.startPeriod}-${course.endPeriod}节`;
  return `周${course.day} ${course.startPeriod}-${course.endPeriod}节 · ${clock}`;
}

function formatWeeks(course: CourseEntry): string {
  if (course.weeksList?.length) {
    return `第 ${course.weeksList.join("、")} 周`;
  }
  let label = `第 ${course.weeks.start}-${course.weeks.end} 周`;
  if (course.odd) label += "（单）";
  if (course.even) label += "（双）";
  return label;
}

/**
 * 课程详情弹层：基础信息 + 备注 + 待办
 * 备注待办采用速记式 composer + accent 卡片，对齐 app MD3 绿调
 * 只读（他人课表）时仅基本信息，扩展区整段不渲染
 */
export const CourseDetailSheet = forwardRef<BottomSheetModal, CourseDetailSheetProps>(
  function CourseDetailSheet(
    {
      course,
      notes,
      todos,
      weekNumber,
      attendance,
      courseAttendances = [],
      onAddNote,
      onDeleteNote,
      onAddTodo,
      onToggleTodo,
      onDeleteTodo,
      onUpsertAttendance,
      onClearAttendance,
      onAddScheduleHere,
      onDismiss,
      readOnly = false,
    },
    ref,
  ) {
    const snapPoints = useMemo(() => (readOnly ? ["42%"] : ["68%"]), [readOnly]);
    const [noteInput, setNoteInput] = useState("");
    const [todoInput, setTodoInput] = useState("");
    const [busy, setBusy] = useState(false);
    /** 上滑动画结束后再挂载考勤/备注/待办，避免与动画抢帧 */
    const [extensionsReady, setExtensionsReady] = useState(false);

    /** 内层列表滑动时暂时关掉外层 BottomSheetScrollView，避免手势被抢走 */
    const [sheetScrollEnabled, setSheetScrollEnabled] = useState(true);

    const lockSheetScroll = useCallback(() => {
      setSheetScrollEnabled(false);
    }, []);

    const unlockSheetScroll = useCallback(() => {
      setSheetScrollEnabled(true);
    }, []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
      ),
      [],
    );

    const handleSheetChange = useCallback((index: number) => {
      setExtensionsReady(index >= 0);
      if (index < 0) setSheetScrollEnabled(true);
    }, []);

    const handleDismiss = useCallback(() => {
      setExtensionsReady(false);
      setSheetScrollEnabled(true);
      setNoteInput("");
      setTodoInput("");
      onDismiss();
    }, [onDismiss]);

    const courseNotes = useMemo(
      () => (course && extensionsReady ? notes.filter((n) => n.courseId === course.id) : []),
      [course, extensionsReady, notes],
    );
    const courseTodos = useMemo(
      () => (course && extensionsReady ? todos.filter((t) => t.courseId === course.id) : []),
      [course, extensionsReady, todos],
    );
    const pendingCount = courseTodos.filter((t) => t.status === "pending").length;

    const submitNote = useCallback(async () => {
      const v = noteInput.trim();
      if (!v || busy) return;
      setBusy(true);
      try {
        await onAddNote(v);
        setNoteInput("");
      } finally {
        setBusy(false);
      }
    }, [busy, noteInput, onAddNote]);

    const submitTodo = useCallback(async () => {
      const v = todoInput.trim();
      if (!v || busy) return;
      setBusy(true);
      try {
        await onAddTodo(v);
        setTodoInput("");
      } finally {
        setBusy(false);
      }
    }, [busy, onAddTodo, todoInput]);

    const requestDeleteNote = useCallback(
      async (id: string) => {
        const ok = await confirm({
          title: "删除备注",
          message: "删除后不可恢复，确定删除这条备注？",
          confirmText: "删除",
          destructive: true,
        });
        if (!ok) return;
        await onDeleteNote(id);
        toast.success("备注已删除");
      },
      [onDeleteNote],
    );

    const requestDeleteTodo = useCallback(
      async (id: string) => {
        const ok = await confirm({
          title: "删除待办",
          message: "删除后不可恢复，确定删除这条待办？",
          confirmText: "删除",
          destructive: true,
        });
        if (!ok) return;
        await onDeleteTodo(id);
        toast.success("待办已删除");
      },
      [onDeleteTodo],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        onChange={handleSheetChange}
        onDismiss={handleDismiss}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={sheetScrollEnabled}
          nestedScrollEnabled
        >
          {course ? (
            <>
              <Text style={styles.courseName}>{course.name}</Text>
              <View style={styles.tagsRow}>
                {course.room ? (
                  <View style={styles.tag}>
                    <Ionicons
                      name="location-outline"
                      size={13}
                      color={lightTokens.color.textSecondary}
                    />
                    <Text style={styles.tagText}>{course.room}</Text>
                  </View>
                ) : null}
                {course.teacher ? (
                  <View style={styles.tag}>
                    <Ionicons
                      name="person-outline"
                      size={13}
                      color={lightTokens.color.textSecondary}
                    />
                    <Text style={styles.tagText}>{course.teacher}</Text>
                  </View>
                ) : null}
                <View style={styles.tag}>
                  <Ionicons name="time-outline" size={13} color={lightTokens.color.textSecondary} />
                  <Text style={styles.tagText}>{formatPeriods(course)}</Text>
                </View>
                <View style={styles.tag}>
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={lightTokens.color.textSecondary}
                  />
                  <Text style={styles.tagText}>{formatWeeks(course)}</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>
                    {WEEKDAY_LABELS[course.day - 1] ?? `周${course.day}`}
                  </Text>
                </View>
              </View>

              {readOnly ? null : !extensionsReady ? (
                <CourseDetailExtensionsSkeleton />
              ) : (
                <>
                  <CourseAttendanceSection
                    weekNumber={weekNumber}
                    day={course.day}
                    attendance={attendance}
                    courseAttendances={courseAttendances}
                    busy={busy}
                    onSelect={async (status) => {
                      setBusy(true);
                      try {
                        await onUpsertAttendance(status);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    onClear={async () => {
                      setBusy(true);
                      try {
                        await onClearAttendance();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />

                  {onAddScheduleHere ? (
                    <Pressable
                      onPress={onAddScheduleHere}
                      style={({ pressed }) => [styles.addScheduleBtn, pressed && { opacity: 0.88 }]}
                    >
                      <Ionicons name="calendar-outline" size={16} color={lightTokens.color.brand} />
                      <Text style={styles.addScheduleText}>在此时间添加日程</Text>
                    </Pressable>
                  ) : null}

                  {/* ===== 备注 ===== */}
                  <SectionHeader icon="book-outline" title="备注" count={courseNotes.length} />
                  <Composer
                    value={noteInput}
                    onChangeText={setNoteInput}
                    placeholder="记下备注，比如这老师人怎么样..."
                    onSubmit={submitNote}
                    disabled={busy}
                    submitIcon="arrow-up"
                  />
                  {courseNotes.length === 0 ? (
                    <EmptyHint icon="book-outline" text="还没有备注，记下重点随时回看" />
                  ) : (
                    <ScrollView
                      style={styles.listScroll}
                      contentContainerStyle={styles.list}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      keyboardShouldPersistTaps="handled"
                      onScrollBeginDrag={lockSheetScroll}
                      onScrollEndDrag={unlockSheetScroll}
                      onMomentumScrollEnd={unlockSheetScroll}
                      onTouchStart={lockSheetScroll}
                      onTouchEnd={unlockSheetScroll}
                    >
                      {courseNotes.map((n) => (
                        <View key={n.id} style={styles.noteCard}>
                          <View style={styles.noteAccent} />
                          <Pressable
                            style={styles.noteBody}
                            onLongPress={() => void requestDeleteNote(n.id)}
                            delayLongPress={350}
                          >
                            <Text style={styles.noteText}>{n.content}</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => void requestDeleteNote(n.id)}
                            hitSlop={10}
                            style={({ pressed }) => [
                              styles.iconBtn,
                              pressed && styles.iconBtnPressed,
                            ]}
                          >
                            <Ionicons
                              name="close"
                              size={16}
                              color={lightTokens.color.textSecondary}
                            />
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  )}

                  {/* ===== 待办 ===== */}
                  <View style={{ marginTop: 28 }}>
                    <SectionHeader
                      icon="checkbox-outline"
                      title="待办"
                      count={pendingCount}
                      countLabel={pendingCount > 0 ? "待完成" : "全部完成"}
                    />
                    <Composer
                      value={todoInput}
                      onChangeText={setTodoInput}
                      placeholder="添加课程待办，比如小组作业..."
                      onSubmit={submitTodo}
                      disabled={busy}
                      submitIcon="arrow-up"
                    />
                    {courseTodos.length === 0 ? (
                      <EmptyHint icon="checkbox-outline" text="没有待办，安心上课" />
                    ) : (
                      <ScrollView
                        style={styles.listScroll}
                        contentContainerStyle={styles.list}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator
                        keyboardShouldPersistTaps="handled"
                        onScrollBeginDrag={lockSheetScroll}
                        onScrollEndDrag={unlockSheetScroll}
                        onMomentumScrollEnd={unlockSheetScroll}
                        onTouchStart={lockSheetScroll}
                        onTouchEnd={unlockSheetScroll}
                      >
                        {courseTodos.map((t) => {
                          const done = t.status === "done";
                          return (
                            <View key={t.id} style={styles.todoCard}>
                              <Pressable
                                onPress={() => onToggleTodo(t.id, done ? "pending" : "done")}
                                hitSlop={8}
                                style={[styles.todoCheck, done && styles.todoCheckDone]}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: done }}
                                accessibilityLabel={done ? "标记为未完成" : "标记为已完成"}
                              >
                                {done ? (
                                  <Ionicons
                                    name="checkmark"
                                    size={14}
                                    color={lightTokens.color.onBrand}
                                  />
                                ) : null}
                              </Pressable>
                              <Text
                                style={[styles.todoText, done && styles.todoTextDone]}
                                numberOfLines={3}
                              >
                                {t.content}
                              </Text>
                              <Pressable
                                onPress={() => void requestDeleteTodo(t.id)}
                                hitSlop={10}
                                style={({ pressed }) => [
                                  styles.iconBtn,
                                  pressed && styles.iconBtnPressed,
                                ]}
                              >
                                <Ionicons
                                  name="close"
                                  size={16}
                                  color={lightTokens.color.textSecondary}
                                />
                              </Pressable>
                            </View>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                </>
              )}
            </>
          ) : (
            <View />
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

function SectionHeader({
  icon,
  title,
  count,
  countLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  count?: number;
  countLabel?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon} size={15} color={lightTokens.color.brand} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {count != null && count > 0 ? (
        <View style={styles.countChip}>
          <Text style={styles.countText}>{countLabel ? `${count} ${countLabel}` : `${count}`}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Composer({
  value,
  onChangeText,
  placeholder,
  onSubmit,
  disabled,
  submitIcon,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  onSubmit: () => void;
  disabled: boolean;
  submitIcon: keyof typeof Ionicons.glyphMap;
}) {
  const canSubmit = value.trim().length > 0 && !disabled;
  return (
    <View style={styles.composer}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={lightTokens.color.textSecondary}
        style={styles.composerInput}
        multiline
        maxLength={2048}
        underlineColorAndroid="transparent"
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={onSubmit}
      />
      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        style={({ pressed }) => [
          styles.composerSubmit,
          !canSubmit && styles.composerSubmitDisabled,
          pressed && canSubmit && { opacity: 0.85 },
        ]}
        hitSlop={6}
      >
        <Ionicons name={submitIcon} size={18} color={lightTokens.color.onBrand} />
      </Pressable>
    </View>
  );
}

function EmptyHint({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={20} color={lightTokens.color.brand} />
      </View>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: lightTokens.color.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    backgroundColor: lightTokens.color.border,
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 48,
  },
  courseName: {
    fontSize: 21,
    fontWeight: "700",
    color: lightTokens.color.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  addScheduleBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: `${lightTokens.color.brandMuted}55`,
  },
  addScheduleText: {
    fontSize: 14,
    fontWeight: "600",
    color: lightTokens.color.brand,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: lightTokens.color.brandMuted,
  },
  tagText: {
    fontSize: 12.5,
    color: lightTokens.color.textSecondary,
    fontWeight: "500",
  },
  // ===== Section =====
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 26,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: lightTokens.color.text,
    letterSpacing: 0.1,
  },
  countChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: lightTokens.color.brandMuted,
  },
  countText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: lightTokens.color.brand,
  },
  // ===== Composer =====
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: lightTokens.color.surfaceVariant,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 48,
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    color: lightTokens.color.text,
    paddingVertical: 8,
    paddingHorizontal: 0,
    maxHeight: 120,
    textAlignVertical: "top",
  },
  composerSubmit: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: lightTokens.color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  composerSubmitDisabled: {
    backgroundColor: lightTokens.color.border,
  },
  // ===== List =====
  listScroll: {
    maxHeight: LIST_MAX_HEIGHT,
    marginTop: 4,
  },
  list: {
    gap: 8,
    paddingBottom: 4,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: lightTokens.color.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
  },
  noteBody: {
    flex: 1,
  },
  cardPressed: {
    backgroundColor: lightTokens.color.brandMuted,
  },
  noteAccent: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    backgroundColor: lightTokens.color.brand,
    marginTop: 2,
    marginBottom: 2,
  },
  noteText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 21,
    color: lightTokens.color.text,
  },
  todoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: lightTokens.color.surface,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
  },
  todoCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: lightTokens.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  todoCheckDone: {
    backgroundColor: lightTokens.color.brand,
    borderColor: lightTokens.color.brand,
  },
  todoText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
    color: lightTokens.color.text,
  },
  todoTextDone: {
    textDecorationLine: "line-through",
    color: lightTokens.color.textSecondary,
    opacity: 0.6,
  },
  iconBtn: {
    padding: 4,
    borderRadius: 12,
    marginTop: 1,
  },
  iconBtnPressed: {
    backgroundColor: lightTokens.color.brandMuted,
  },
  // ===== Empty =====
  empty: {
    alignItems: "center",
    paddingVertical: 22,
    gap: 8,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: lightTokens.color.brandMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    color: lightTokens.color.textSecondary,
  },
});

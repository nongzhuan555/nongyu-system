import { confirm } from "@/components/ui/confirm";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { trackClick } from "@/modules/telemetry";
import { WEEKDAY_LABELS } from "../model/courseTimes";
import { COURSE_COLOR_PALETTE } from "../model/colors";
import type { ScheduleEntry } from "../model/types";
import type { EmptyCellTarget } from "./WeekPager";
import { newCourseExtId } from "../model/genId";
import { ScheduleFormSkeleton } from "./CourseSkeletons";

type ScheduleFormSheetProps = {
  /** 编辑目标；为 null 表示新增（此时 target 必填） */
  schedule: ScheduleEntry | null;
  /** 新增时由空格子点击提供默认值 */
  target: EmptyCellTarget | null;
  studentId: string;
  onSubmit: (entry: ScheduleEntry) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onDismiss: () => void;
};

function parseWeeksInput(raw: string): number[] {
  return raw
    .split(/[，,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
}

/**
 * 自定义日程新增/编辑表单
 */
export const ScheduleFormSheet = forwardRef<BottomSheetModal, ScheduleFormSheetProps>(
  function ScheduleFormSheet({ schedule, target, studentId, onSubmit, onDelete, onDismiss }, ref) {
    const styles = useStyles();
    const t = useThemeTokens();
    const isEdit = !!schedule;
    const snapPoints = useMemo(() => ["70%"], []);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [location, setLocation] = useState("");
    const [day, setDay] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
    const [startPeriod, setStartPeriod] = useState(1);
    const [endPeriod, setEndPeriod] = useState(2);
    const [weeksInput, setWeeksInput] = useState("");
    /** 色板下标；null = 默认无色样式；新建默认 0 */
    const [colorIndex, setColorIndex] = useState<number | null>(0);
    const [saving, setSaving] = useState(false);
    /** 上滑到位后再挂表单，过渡期骨架 */
    const [contentReady, setContentReady] = useState(false);

    useEffect(() => {
      if (schedule) {
        setTitle(schedule.title);
        setContent(schedule.content);
        setLocation(schedule.location);
        setDay(schedule.day);
        setStartPeriod(schedule.startPeriod);
        setEndPeriod(schedule.endPeriod);
        setWeeksInput(schedule.weeksList.length ? schedule.weeksList.join(",") : "");
        setColorIndex(schedule.colorIndex ?? null);
      } else if (target) {
        setTitle("");
        setContent("");
        setLocation("");
        setDay(target.day);
        setStartPeriod(target.startPeriod);
        setEndPeriod(target.endPeriod);
        setWeeksInput("");
        setColorIndex(0);
      }
    }, [schedule, target]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
      ),
      [],
    );

    const handleSheetChange = useCallback((index: number) => {
      setContentReady(index >= 0);
    }, []);

    const handleDismiss = useCallback(() => {
      setContentReady(false);
      onDismiss();
    }, [onDismiss]);

    const canSave = title.trim().length > 0 && startPeriod <= endPeriod && !saving;

    const handleSave = useCallback(async () => {
      if (!canSave) return;
      trackClick("course_schedule_save");
      setSaving(true);
      try {
        const now = new Date().toISOString();
        const entry: ScheduleEntry = schedule
          ? {
              ...schedule,
              title: title.trim(),
              content: content.trim(),
              location: location.trim(),
              day,
              startPeriod,
              endPeriod,
              weeksList: parseWeeksInput(weeksInput),
              colorIndex,
              updatedAt: now,
            }
          : {
              id: newCourseExtId(),
              studentId,
              title: title.trim(),
              content: content.trim(),
              location: location.trim(),
              day,
              startPeriod,
              endPeriod,
              weeksList: parseWeeksInput(weeksInput),
              colorIndex,
              createdAt: now,
              updatedAt: now,
            };
        await onSubmit(entry);
      } finally {
        setSaving(false);
      }
    }, [
      canSave,
      colorIndex,
      content,
      day,
      endPeriod,
      location,
      onSubmit,
      schedule,
      startPeriod,
      studentId,
      title,
      weeksInput,
    ]);

    const handleDelete = useCallback(async () => {
      if (!schedule || !onDelete) return;
      const ok = await confirm({
        title: "删除日程",
        message: "删除后不可恢复，确定删除这条日程？",
        confirmText: "删除",
        destructive: true,
      });
      if (!ok) return;
      setSaving(true);
      try {
        await onDelete(schedule.id);
      } finally {
        setSaving(false);
      }
    }, [onDelete, schedule]);

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
        >
          {!contentReady ? (
            <ScheduleFormSkeleton />
          ) : (
            <>
              <Text style={styles.header}>{isEdit ? "编辑日程" : "新增日程"}</Text>

              <Text style={styles.label}>标题</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="日程标题"
                placeholderTextColor={t.color.textSecondary}
                style={styles.input}
                maxLength={128}
              />

              <Text style={styles.label}>地点</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="可选"
                placeholderTextColor={t.color.textSecondary}
                style={styles.input}
                maxLength={128}
              />

              <Text style={styles.label}>备注</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="可选"
                placeholderTextColor={t.color.textSecondary}
                style={[styles.input, styles.textArea]}
                multiline
                maxLength={1024}
              />

              <Text style={styles.label}>星期</Text>
              <View style={styles.dayRow}>
                {WEEKDAY_LABELS.map((label, i) => {
                  const d = (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
                  const active = day === d;
                  return (
                    <Pressable
                      key={label}
                      onPress={() => setDay(d)}
                      style={[styles.dayBtn, active && styles.dayBtnActive]}
                    >
                      <Text style={[styles.dayBtnText, active && styles.dayBtnTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.periodRow}>
                <View style={styles.periodCol}>
                  <Text style={styles.label}>开始节次</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => setStartPeriod((p) => Math.max(1, p - 1))}
                      style={styles.stepBtn}
                    >
                      <Ionicons name="remove" size={18} color={t.color.text} />
                    </Pressable>
                    <Text style={styles.stepValue}>{startPeriod}</Text>
                    <Pressable
                      onPress={() => setStartPeriod((p) => Math.min(10, p + 1))}
                      style={styles.stepBtn}
                    >
                      <Ionicons name="add" size={18} color={t.color.text} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.periodCol}>
                  <Text style={styles.label}>结束节次</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => setEndPeriod((p) => Math.max(1, p - 1))}
                      style={styles.stepBtn}
                    >
                      <Ionicons name="remove" size={18} color={t.color.text} />
                    </Pressable>
                    <Text style={styles.stepValue}>{endPeriod}</Text>
                    <Pressable
                      onPress={() => setEndPeriod((p) => Math.min(10, p + 1))}
                      style={styles.stepBtn}
                    >
                      <Ionicons name="add" size={18} color={t.color.text} />
                    </Pressable>
                  </View>
                </View>
              </View>

              <Text style={styles.label}>教学周（逗号分隔，留空=全周）</Text>
              <TextInput
                value={weeksInput}
                onChangeText={setWeeksInput}
                placeholder="如 1,3,5"
                placeholderTextColor={t.color.textSecondary}
                style={styles.input}
                keyboardType="numeric"
              />

              <Text style={styles.label}>颜色</Text>
              <View style={styles.colorRow}>
                <Pressable
                  onPress={() => setColorIndex(null)}
                  style={[styles.colorNone, colorIndex === null && styles.colorNoneActive]}
                  accessibilityRole="button"
                  accessibilityLabel="默认无色"
                >
                  <Text
                    style={[
                      styles.colorNoneText,
                      colorIndex === null && styles.colorNoneTextActive,
                    ]}
                  >
                    默认
                  </Text>
                </Pressable>
                {COURSE_COLOR_PALETTE.map((c, i) => {
                  const active = colorIndex === i;
                  return (
                    <Pressable
                      key={c.bg}
                      onPress={() => setColorIndex(i)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c.bg, borderColor: active ? c.text : c.bg },
                        active && styles.colorSwatchActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`颜色 ${i + 1}`}
                    >
                      {active ? <Ionicons name="checkmark" size={14} color={c.text} /> : null}
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={handleSave}
                disabled={!canSave}
                style={({ pressed }) => [
                  styles.saveBtn,
                  !canSave && styles.saveBtnDisabled,
                  pressed && canSave && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.saveBtnText}>{saving ? "保存中…" : "保存"}</Text>
              </Pressable>

              {isEdit && onDelete ? (
                <Pressable
                  onPress={handleDelete}
                  disabled={saving}
                  style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.deleteBtnText}>删除日程</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

const useStyles = createThemedStyles((t) => ({
  sheetBg: {
    backgroundColor: t.color.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handle: {
    backgroundColor: t.color.border,
    width: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    fontSize: 18,
    fontWeight: "700",
    color: t.color.text,
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: t.color.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: t.color.text,
    backgroundColor: t.color.surface,
    minHeight: 44,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  dayRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  dayBtn: {
    flex: 1,
    minWidth: 40,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: t.color.brandMuted,
  },
  dayBtnActive: {
    backgroundColor: t.color.brand,
  },
  dayBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: t.color.textSecondary,
  },
  dayBtnTextActive: {
    color: "#fff",
  },
  periodRow: {
    flexDirection: "row",
    gap: 12,
  },
  periodCol: {
    flex: 1,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  colorNone: {
    minWidth: 52,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.brandMuted,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorNoneActive: {
    borderColor: t.color.brand,
  },
  colorNoneText: {
    fontSize: 13,
    fontWeight: "600",
    color: t.color.textSecondary,
  },
  colorNoneTextActive: {
    color: t.color.brand,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  colorSwatchActive: {
    borderWidth: 2,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    borderRadius: 8,
    paddingHorizontal: 4,
    height: 44,
  },
  stepBtn: {
    padding: 8,
  },
  stepValue: {
    fontSize: 16,
    fontWeight: "700",
    color: t.color.text,
    minWidth: 24,
    textAlign: "center",
  },
  saveBtn: {
    marginTop: 24,
    backgroundColor: t.color.brand,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  deleteBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteBtnText: {
    fontSize: 15,
    color: "#e5484d",
  },
}));

import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { getPaletteColor } from "../model/colors";
import { WEEKDAY_LABELS } from "../model/courseTimes";
import type { ScheduleEntry } from "../model/types";

type ScheduleListSheetProps = {
  visible: boolean;
  schedules: ScheduleEntry[];
  onClose: () => void;
  onSelect: (schedule: ScheduleEntry) => void;
};

/**
 * 按星期 → 起始节次 → 标题排序，保证列表顺序稳定可读。
 */
function compareSchedules(a: ScheduleEntry, b: ScheduleEntry): number {
  if (a.day !== b.day) return a.day - b.day;
  if (a.startPeriod !== b.startPeriod) return a.startPeriod - b.startPeriod;
  if (a.endPeriod !== b.endPeriod) return a.endPeriod - b.endPeriod;
  return a.title.localeCompare(b.title, "zh");
}

function formatWeeks(weeksList: number[]): string {
  if (!weeksList.length) return "全周";
  return `第 ${weeksList.join(",")} 周`;
}

/**
 * 课表「更多」→ 我的自定义日程：自下而上半屏偏高列表。
 */
export function ScheduleListSheet({
  visible,
  schedules,
  onClose,
  onSelect,
}: ScheduleListSheetProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.round(height * 0.65);

  const sorted = useMemo(() => [...schedules].sort(compareSchedules), [schedules]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={styles.mask}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="关闭日程列表"
        />
        <View
          style={[
            styles.sheet,
            { height: sheetHeight, paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>我的自定义日程</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="关闭"
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={22} color={t.color.textSecondary} />
            </Pressable>
          </View>

          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={36} color={t.color.brand} />
              <Text style={styles.emptyText}>暂无自定义日程</Text>
              <Text style={styles.emptyHint}>在课表空格子点击即可添加</Text>
            </View>
          ) : (
            <FlatList
              data={sorted}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const palette = getPaletteColor(item.colorIndex);
                const meta = [
                  WEEKDAY_LABELS[item.day - 1] ?? `周${item.day}`,
                  `${item.startPeriod}-${item.endPeriod}节`,
                  item.location || null,
                  formatWeeks(item.weeksList),
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <Pressable
                    onPress={() => onSelect(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`打开日程 ${item.title}`}
                    style={({ pressed }) => [
                      styles.row,
                      palette
                        ? { backgroundColor: palette.bg, borderColor: `${palette.text}40` }
                        : null,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.rowBody}>
                      <Text
                        style={[styles.rowTitle, palette ? { color: palette.text } : null]}
                        numberOfLines={1}
                      >
                        {item.title || "未命名日程"}
                      </Text>
                      <Text
                        style={[
                          styles.rowMeta,
                          palette ? { color: palette.text, opacity: 0.85 } : null,
                        ]}
                        numberOfLines={2}
                      >
                        {meta}
                      </Text>
                      {item.content ? (
                        <Text
                          style={[
                            styles.rowContent,
                            palette ? { color: palette.text, opacity: 0.8 } : null,
                          ]}
                          numberOfLines={2}
                        >
                          {item.content}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={palette?.text ?? t.color.textSecondary}
                    />
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  mask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheet: {
    backgroundColor: t.color.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${t.color.brand}22`,
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.color.border,
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: t.color.text,
    paddingLeft: 32,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    backgroundColor: t.color.surfaceVariant,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: t.color.text,
  },
  rowMeta: {
    fontSize: 13,
    color: t.color.textSecondary,
    lineHeight: 18,
  },
  rowContent: {
    fontSize: 13,
    color: t.color.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: t.color.text,
  },
  emptyHint: {
    fontSize: 13,
    color: t.color.textSecondary,
  },
  pressed: {
    opacity: 0.85,
  },
}));

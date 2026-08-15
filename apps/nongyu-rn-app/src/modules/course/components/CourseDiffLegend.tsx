import { Pressable, Text, View } from "react-native";
import type { CourseDiffMode } from "../store/courseUiStore";
import { createThemedStyles } from "@/theme/createThemedStyles";

type CourseDiffLegendProps = {
  mode: CourseDiffMode;
  onModeChange: (mode: CourseDiffMode) => void;
};

/**
 * Diff 图例与模式切换（退出对比在课表顶栏，避免与回到本周半圆重叠）
 */
export function CourseDiffLegend({ mode, onModeChange }: CourseDiffLegendProps) {
  const styles = useStyles();

  return (
    <View style={styles.root}>
      <View style={styles.modes}>
        <Pressable
          style={[styles.chip, mode === "conflict" && styles.chipActive]}
          onPress={() => onModeChange("conflict")}
        >
          <Text style={[styles.chipText, mode === "conflict" && styles.chipTextActive]}>
            冲突叠色
          </Text>
        </Pressable>
        <Pressable
          style={[styles.chip, mode === "free" && styles.chipActive]}
          onPress={() => onModeChange("free")}
        >
          <Text style={[styles.chipText, mode === "free" && styles.chipTextActive]}>空闲交集</Text>
        </Pressable>
      </View>
      {mode === "conflict" ? (
        <View style={styles.legend}>
          <LegendDot color="rgba(37, 99, 235, 0.55)" label="仅自己" />
          <LegendDot color="rgba(234, 88, 12, 0.55)" label="仅对方" />
          <LegendDot color="rgba(220, 38, 38, 0.55)" label="双方有课" />
        </View>
      ) : (
        <View style={styles.legend}>
          <LegendDot color="rgba(22, 163, 74, 0.55)" label="双方都空" />
          <Text style={styles.hint}>其它格为有课时段</Text>
        </View>
      )}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.dotRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.dotLabel}>{label}</Text>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    paddingHorizontal: t.space.md,
    paddingBottom: t.space.sm,
    gap: 8,
  },
  modes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.full,
    backgroundColor: t.color.surfaceVariant,
  },
  chipActive: {
    backgroundColor: t.color.brandMuted,
  },
  chipText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    fontWeight: "600",
  },
  chipTextActive: {
    color: t.color.brand,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  dotLabel: {
    fontSize: 12,
    color: t.color.textSecondary,
  },
  hint: {
    fontSize: 12,
    color: t.color.textSecondary,
  },
}));

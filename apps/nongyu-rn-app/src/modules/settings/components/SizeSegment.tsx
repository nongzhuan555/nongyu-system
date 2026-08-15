import { Pressable, StyleSheet, Text, View } from "react-native";
import { createThemedStyles } from "@/theme/createThemedStyles";
import {
  COURSE_SIZE_LABELS,
  COURSE_SIZE_SCALES,
  type CourseSizeScale,
} from "@/modules/course/model/coursePrefs";

type SizeSegmentProps = {
  value: CourseSizeScale;
  onChange: (size: CourseSizeScale) => void;
};

/**
 * 小 / 中 / 大 三档分段
 */
export function SizeSegment({ value, onChange }: SizeSegmentProps) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      {COURSE_SIZE_SCALES.map((scale) => {
        const active = scale === value;
        return (
          <Pressable
            key={scale}
            onPress={() => onChange(scale)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {COURSE_SIZE_LABELS[scale]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: t.radius.md,
    backgroundColor: t.color.surfaceVariant,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  chipActive: {
    backgroundColor: t.color.brandMuted,
    borderColor: t.color.brand,
  },
  chipText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    fontWeight: "600",
  },
  chipTextActive: {
    color: t.color.brand,
  },
}));

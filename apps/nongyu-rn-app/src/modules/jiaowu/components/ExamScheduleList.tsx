import { StyleSheet, Text, View } from "react-native";
import { createThemedStyles } from "@/theme/createThemedStyles";

export type ExamScheduleItem = {
  courseName?: string;
  examTime?: string;
  examRoom?: string;
  seatNumber?: string;
  assessmentMethod?: string;
};

type ExamScheduleListProps = {
  items: ExamScheduleItem[];
};

/**
 * 考试安排卡片列表（无壳）
 */
export function ExamScheduleList({ items }: ExamScheduleListProps) {
  const styles = useStyles();

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={`${item.courseName}-${index}`} style={styles.card}>
          <Text style={styles.course}>{item.courseName || "未命名课程"}</Text>
          {item.examTime ? <Text style={styles.time}>{item.examTime}</Text> : null}
          <Text style={styles.meta}>
            {[
              item.examRoom,
              item.seatNumber ? `座位 ${item.seatNumber}` : null,
              item.assessmentMethod,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  list: {
    gap: t.space.sm,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.md,
    padding: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    gap: 6,
  },
  course: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
  },
  time: {
    fontSize: t.fontSize.sm,
    color: t.color.brand,
    lineHeight: 20,
  },
  meta: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
}));

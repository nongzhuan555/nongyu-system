import { useThemeTokens } from "@/theme/ThemeProvider";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COURSE_META_FONT, COURSE_NAME_FONT, type CourseSizeScale } from "../model/coursePrefs";
import type { ScheduleEntry } from "../model/types";
import { createThemedStyles } from "@/theme/createThemedStyles";

type ScheduleCardProps = {
  schedule: ScheduleEntry;
  height: number;
  fontScale: CourseSizeScale;
  onPress: () => void;
};

/**
 * 自定义日程卡片（沿用课表卡片样式，左上角小图标区分）
 */
export function ScheduleCard({ schedule, height, fontScale, onPress }: ScheduleCardProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const nameSize = COURSE_NAME_FONT[fontScale];
  const metaSize = COURSE_META_FONT[fontScale];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          height,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <View style={styles.badge}>
        <Ionicons name="calendar-outline" size={10} color={t.color.brand} />
      </View>
      <Text
        numberOfLines={4}
        style={[styles.title, { fontSize: nameSize, lineHeight: nameSize + 3 }]}
      >
        {schedule.title}
      </Text>
      {schedule.location ? (
        <Text
          numberOfLines={2}
          style={[styles.meta, { fontSize: metaSize, lineHeight: metaSize + 2 }]}
        >
          {schedule.location}
        </Text>
      ) : null}
      {schedule.content ? (
        <Text
          numberOfLines={1}
          style={[styles.meta, { fontSize: metaSize, lineHeight: metaSize + 2 }]}
        >
          {schedule.content}
        </Text>
      ) : null}
    </Pressable>
  );
}

const useStyles = createThemedStyles((t) => ({
  card: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minHeight: 56,
    justifyContent: "center",
    backgroundColor: `${t.color.brandMuted}80`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${t.color.brand}40`,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  badge: {
    position: "absolute",
    top: 3,
    right: 3,
    opacity: 0.7,
  },
  title: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 2,
    color: t.color.brand,
  },
  meta: {
    opacity: 0.85,
    marginTop: 1,
    textAlign: "center",
    color: t.color.textSecondary,
  },
}));

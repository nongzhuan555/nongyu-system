import { useThemeTokens } from "@/theme/ThemeProvider";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COURSE_META_FONT, COURSE_NAME_FONT, type CourseSizeScale } from "../model/coursePrefs";
import { getPaletteColor } from "../model/colors";
import type { ScheduleEntry } from "../model/types";
import { createThemedStyles } from "@/theme/createThemedStyles";

type ScheduleCardProps = {
  schedule: ScheduleEntry;
  height: number;
  fontScale: CourseSizeScale;
  /** 无 onPress 时纯展示（由堆叠宿主接管手势） */
  onPress?: () => void;
};

/**
 * 自定义日程卡片：浅底细边、弱图标；有 colorIndex 时用色板着色，仍与课程实心块区分
 */
export function ScheduleCard({ schedule, height, fontScale, onPress }: ScheduleCardProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const nameSize = COURSE_NAME_FONT[fontScale];
  const metaSize = COURSE_META_FONT[fontScale];
  const palette = getPaletteColor(schedule.colorIndex);

  const bg = palette?.bg ?? `${t.color.surface}F2`;
  const textColor = palette?.text ?? t.color.text;
  const metaColor = palette?.text ?? t.color.textSecondary;
  const borderColor = palette ? `${palette.text}40` : `${t.color.brand}28`;
  const iconColor = palette?.text ?? t.color.brand;

  const body = (
    <>
      <View style={styles.badge} pointerEvents="none">
        <Ionicons name="calendar-outline" size={9} color={iconColor} />
      </View>
      <Text
        numberOfLines={4}
        style={[styles.title, { fontSize: nameSize, lineHeight: nameSize + 3, color: textColor }]}
      >
        {schedule.title}
      </Text>
      {schedule.location ? (
        <Text
          numberOfLines={2}
          style={[
            styles.meta,
            {
              fontSize: metaSize,
              lineHeight: metaSize + 2,
              color: metaColor,
              opacity: palette ? 0.85 : 0.72,
            },
          ]}
        >
          {schedule.location}
        </Text>
      ) : null}
      {schedule.content ? (
        <Text
          numberOfLines={1}
          style={[
            styles.meta,
            {
              fontSize: metaSize,
              lineHeight: metaSize + 2,
              color: metaColor,
              opacity: palette ? 0.85 : 0.72,
            },
          ]}
        >
          {schedule.content}
        </Text>
      ) : null}
    </>
  );

  const cardStyle = [
    styles.card,
    {
      height,
      backgroundColor: bg,
      borderColor,
    },
  ];

  if (!onPress) {
    return <View style={cardStyle}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        ...cardStyle,
        {
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      {body}
    </Pressable>
  );
}

const useStyles = createThemedStyles(() => ({
  card: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 5,
    minHeight: 56,
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    position: "absolute",
    top: 4,
    left: 4,
    opacity: 0.55,
  },
  title: {
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  meta: {
    marginTop: 1,
    textAlign: "center",
  },
}));

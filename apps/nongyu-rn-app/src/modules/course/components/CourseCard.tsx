import { Pressable, StyleSheet, Text } from "react-native";
import { getCourseColor } from "../model/colors";
import { COURSE_META_FONT, COURSE_NAME_FONT, type CourseSizeScale } from "../model/coursePrefs";
import type { CourseEntry } from "../model/types";

type CourseCardProps = {
  course: CourseEntry;
  height: number;
  fontScale: CourseSizeScale;
  onPress: () => void;
};

/**
 * 周网格课程卡（对齐旧版：居中课名 / 教室 / 教师）
 */
export function CourseCard({ course, height, fontScale, onPress }: CourseCardProps) {
  const colors = getCourseColor(course.name);
  const nameSize = COURSE_NAME_FONT[fontScale];
  const metaSize = COURSE_META_FONT[fontScale];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          height,
          backgroundColor: colors.bg,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <Text
        numberOfLines={4}
        style={[
          styles.title,
          {
            color: colors.text,
            fontSize: nameSize,
            lineHeight: nameSize + 3,
          },
        ]}
      >
        {course.name}
      </Text>
      {course.room ? (
        <Text
          numberOfLines={2}
          style={[
            styles.meta,
            {
              color: colors.text,
              fontSize: metaSize,
              lineHeight: metaSize + 2,
            },
          ]}
        >
          {course.room}
        </Text>
      ) : null}
      {course.teacher ? (
        <Text
          numberOfLines={1}
          style={[
            styles.meta,
            {
              color: colors.text,
              fontSize: metaSize,
              lineHeight: metaSize + 2,
            },
          ]}
        >
          {course.teacher}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minHeight: 56,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 2,
  },
  meta: {
    opacity: 0.85,
    marginTop: 1,
    textAlign: "center",
  },
});

import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { SessionProfile } from "@/stores/session";
import { lightTokens } from "@/theme/tokens";

type InfoField = {
  label: string;
  value: string;
};

type InfoGridProps = {
  profile: SessionProfile;
};

/**
 * 基本信息：纯文字「档案笺」网格；过长省略，点按看全文
 */
export function InfoGrid({ profile }: InfoGridProps) {
  const fields: InfoField[] = [
    { label: "学院", value: profile.college || "未知" },
    { label: "专业", value: profile.major || "未知" },
    { label: "班级", value: profile.className || "未知" },
    { label: "年级", value: profile.grade || "未知" },
    { label: "校区", value: profile.campus || "未知" },
    { label: "生源地", value: profile.hometown || "未知" },
  ];

  const showFull = (field: InfoField) => {
    Alert.alert(field.label, field.value);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>基本信息</Text>
      <View style={styles.grid}>
        {fields.map((field) => (
          <Pressable
            key={field.label}
            accessibilityRole="button"
            accessibilityLabel={`${field.label}：${field.value}`}
            accessibilityHint="查看完整内容"
            onPress={() => showFull(field)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.ink} />
            <View style={styles.textCol}>
              <Text style={styles.label}>{field.label}</Text>
              <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
                {field.value}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: lightTokens.space.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: lightTokens.color.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: "47.8%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 64,
    borderRadius: 14,
    backgroundColor: lightTokens.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.1)",
    overflow: "hidden",
    // 极轻抬升，贴近首页浅浮层气质
    shadowColor: "#0A7C59",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  cardPressed: {
    backgroundColor: lightTokens.color.brandMuted,
    opacity: 0.96,
  },
  /** 左侧墨线：替代 icon，作档案笺签名 */
  ink: {
    width: 3,
    backgroundColor: lightTokens.color.brand,
    opacity: 0.72,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: lightTokens.color.textSecondary,
    letterSpacing: 1.4,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: lightTokens.color.text,
    letterSpacing: 0.15,
    lineHeight: 20,
  },
});

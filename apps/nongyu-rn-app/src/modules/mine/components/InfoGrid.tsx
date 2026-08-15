import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import type { SessionProfile } from "@/stores/session";
import { profileFieldValue } from "@/modules/mine/profileFields";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useThemeTokens } from "@/theme/ThemeProvider";

type InfoGridProps = {
  profile: SessionProfile;
  onPress?: () => void;
};

type InfoCardDef = {
  key: keyof SessionProfile;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

/** 基本信息六格：姓名 / 学号 / 学院 / 专业 / 班级 / 年级 */
const INFO_CARDS: InfoCardDef[] = [
  { key: "name", label: "姓名", icon: "account-outline" },
  { key: "studentId", label: "学号", icon: "card-account-details-outline" },
  { key: "college", label: "学院", icon: "domain" },
  { key: "major", label: "专业", icon: "school-outline" },
  { key: "className", label: "班级", icon: "account-group-outline" },
  { key: "grade", label: "年级", icon: "calendar-clock-outline" },
];

/**
 * 我的页基本信息：带 icon 的双列卡片网格
 */
export function InfoGrid({ profile, onPress }: InfoGridProps) {
  const styles = useStyles();
  const t = useThemeTokens();

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="基本信息，查看全部"
        onPress={onPress}
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.pressed]}
      >
        <Text style={styles.sectionTitle}>基本信息</Text>
        {onPress ? (
          <Ionicons name="chevron-forward" size={16} color={t.color.textSecondary} />
        ) : null}
      </Pressable>

      <View style={styles.grid}>
        {INFO_CARDS.map((item) => (
          <InfoCard
            key={item.key}
            label={item.label}
            value={profileFieldValue(profile, item.key)}
            icon={item.icon}
          />
        ))}
      </View>
    </View>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  const styles = useStyles();
  const t = useThemeTokens();
  return (
    <View style={styles.infoCard}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon} size={20} color={t.color.brand} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  section: {
    marginTop: 4,
  },
  pressed: {
    opacity: 0.92,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginLeft: 4,
    paddingRight: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: t.color.textSecondary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "46%",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    gap: 12,
    backgroundColor: t.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.brandMuted,
  },
  infoContent: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: 11,
    marginBottom: 2,
    color: t.color.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: t.color.text,
  },
}));

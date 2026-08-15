import { useThemeTokens } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { createThemedStyles } from "@/theme/createThemedStyles";

export type SettingsNavItem = {
  key: string;
  title: string;
  description?: string;
  /** 可进入子页 */
  available: boolean;
  onPress?: () => void;
};

type SettingsSectionListProps = {
  items: SettingsNavItem[];
};

/**
 * 设置首页分区列表
 */
export function SettingsSectionList({ items }: SettingsSectionListProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={item.available ? item.onPress : undefined}
          disabled={!item.available}
          style={({ pressed }) => [
            styles.row,
            item.available && pressed && styles.rowPressed,
            !item.available && styles.rowDisabled,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !item.available }}
        >
          <View style={styles.textCol}>
            <Text style={[styles.title, !item.available && styles.titleDisabled]}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={styles.desc}>{item.description}</Text>
            ) : !item.available ? (
              <Text style={styles.desc}>即将开放</Text>
            ) : null}
          </View>
          {item.available ? (
            <Ionicons name="chevron-forward" size={20} color={t.color.textSecondary} />
          ) : (
            <Text style={styles.badge}>即将开放</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  rowPressed: {
    opacity: 0.88,
  },
  rowDisabled: {
    opacity: 0.72,
  },
  textCol: {
    flex: 1,
    paddingRight: t.space.sm,
  },
  title: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
  },
  titleDisabled: {
    color: t.color.textSecondary,
  },
  desc: {
    marginTop: 4,
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 18,
  },
  badge: {
    fontSize: 11,
    color: t.color.textSecondary,
  },
}));

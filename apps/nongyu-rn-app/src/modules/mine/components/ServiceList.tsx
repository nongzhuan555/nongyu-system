import { useThemeTokens } from "@/theme/ThemeProvider";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ServiceItem } from "@/modules/mine/constants/services";
import { createThemedStyles } from "@/theme/createThemedStyles";

type ServiceListProps = {
  items: ServiceItem[];
  onPressItem: (item: ServiceItem) => void;
};

/**
 * 「更多服务」：克制列表，少装饰
 */
export function ServiceList({ items, onPressItem }: ServiceListProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionEyebrow}>更多服务</Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <View key={item.key}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => onPressItem(item)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Ionicons name={item.icon} size={20} color={t.color.brand} style={styles.icon} />
              <View style={styles.textWrap}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description} numberOfLines={1}>
                  {item.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.color.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  section: {
    marginTop: t.space.xl,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: t.color.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: "uppercase",
  },
  list: {
    borderRadius: 20,
    backgroundColor: t.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
  },
  pressed: {
    backgroundColor: t.color.brandMuted,
  },
  icon: {
    marginTop: 1,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: t.color.text,
    letterSpacing: 0.15,
  },
  description: {
    fontSize: 12,
    color: t.color.textSecondary,
    lineHeight: 17,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
    marginLeft: 52,
  },
}));

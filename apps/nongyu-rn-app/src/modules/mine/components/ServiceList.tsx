import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SERVICE_ITEMS, type ServiceItem } from "@/modules/mine/constants/services";
import { lightTokens } from "@/theme/tokens";

type ServiceListProps = {
  onPressItem: (item: ServiceItem) => void;
};

/**
 * 「更多服务」列表
 */
export function ServiceList({ onPressItem }: ServiceListProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>更多服务</Text>
      <View style={styles.list}>
        {SERVICE_ITEMS.map((item, index) => (
          <View key={item.key}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => onPressItem(item)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={20} color={lightTokens.color.brand} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description} numberOfLines={1}>
                  {item.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={lightTokens.color.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: lightTokens.space.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: lightTokens.color.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  list: {
    borderRadius: lightTokens.radius.lg,
    backgroundColor: lightTokens.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: lightTokens.space.md,
    gap: 12,
  },
  pressed: {
    backgroundColor: lightTokens.color.brandMuted,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTokens.color.brandMuted,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
    color: lightTokens.color.text,
    marginBottom: 2,
  },
  description: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: lightTokens.color.border,
    marginLeft: 64,
  },
});

import { useThemeTokens } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { HomeSurface } from "@/modules/home/components/HomeSurface";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { trackClick } from "@/modules/telemetry";

type EntryItem = {
  key: string;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
};

const ENTRIES: EntryItem[] = [
  {
    key: "jiaowu",
    label: "教务系统",
    hint: "农屿教务功能集成",
    icon: "school",
    href: "/home/jiaowu" as Href,
  },
  {
    key: "second",
    label: "二课系统",
    hint: "农屿二课功能集成",
    icon: "medal",
    href: "/home/second" as Href,
  },
];

/**
 * 教务 / 二课入口卡片
 */
export function EntryCard() {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();

  return (
    <HomeSurface style={styles.card}>
      {ENTRIES.map((item, index) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          style={({ pressed }) => [
            styles.row,
            index > 0 && styles.rowBorder,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            trackClick(`entry_${item.key}`);
            router.push(item.href);
          }}
        >
          <View style={styles.iconBox}>
            <Ionicons name={item.icon} size={18} color={t.color.brand} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={styles.hint} numberOfLines={1}>
              {item.hint}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={t.color.textSecondary} />
        </Pressable>
      ))}
    </HomeSurface>
  );
}

const useStyles = createThemedStyles((t) => ({
  card: {
    marginHorizontal: t.space.md,
    marginBottom: t.space.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    minHeight: 52,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(10, 124, 89, 0.1)",
  },
  pressed: {
    opacity: 0.72,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.brandMuted,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: t.color.text,
  },
  hint: {
    fontSize: 11,
    color: t.color.textSecondary,
  },
}));

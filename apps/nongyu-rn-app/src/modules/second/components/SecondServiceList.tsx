import { useThemeTokens } from "@/theme/ThemeProvider";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "@/components/ui/toast";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { SECOND_SERVICES, type SecondServiceItem } from "@/modules/second/constants/services";
import { SecondSurface } from "@/modules/second/components/SecondSurface";
import { trackClick } from "@/modules/telemetry";

type Props = {
  isAuthenticated: boolean;
};

/**
 * 二课首页入口卡（主题色 + 简约面）
 */
export function SecondServiceList({ isAuthenticated }: Props) {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();

  const onPress = (item: SecondServiceItem) => {
    trackClick(`second_entry_${item.key}`);
    if (!isAuthenticated) {
      toast.info("需要登录", { description: "请先登录二课（i川农）账号" });
      router.push("/home/second/login" as Href);
      return;
    }
    router.push(item.href);
  };

  return (
    <View style={styles.grid}>
      {SECOND_SERVICES.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onPress={() => onPress(item)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <SecondSurface style={styles.card} padded={false}>
            <View style={styles.cardContent}>
              <View style={styles.iconBox}>
                <Ionicons name={item.icon} size={22} color={t.color.brand} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.hint} numberOfLines={1}>
                  {item.hint}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.color.textSecondary} />
            </View>
          </SecondSurface>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  grid: { gap: t.space.md },
  card: { overflow: "hidden" },
  pressed: { opacity: 0.92 },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: t.radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    backgroundColor: t.color.brandMuted,
  },
  copy: { flex: 1, justifyContent: "center", gap: 2 },
  title: {
    fontWeight: "600",
    fontSize: t.fontSize.md,
    color: t.color.text,
  },
  hint: {
    color: t.color.textSecondary,
    fontSize: t.fontSize.sm,
  },
}));

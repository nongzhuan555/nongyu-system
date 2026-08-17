import { useThemeTokens } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { toast } from "@/components/ui/toast";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { JIAOWU_SERVICES, type JiaowuServiceItem } from "@/modules/jiaowu/constants/services";
import { trackClick } from "@/modules/telemetry";

type JiaowuServiceListProps = {
  isAuthenticated: boolean;
};

/**
 * 教务首页服务入口列表（未登录锁定需鉴权项）
 */
export function JiaowuServiceList({ isAuthenticated }: JiaowuServiceListProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();

  const onPress = (item: JiaowuServiceItem) => {
    trackClick(`jiaowu_entry_${item.key}`);
    if (item.requireAuth && !isAuthenticated) {
      toast.info("需要登录", { description: "请先使用教务学号密码登录" });
      return;
    }
    router.push(item.href);
  };

  return (
    <View style={styles.list}>
      {JIAOWU_SERVICES.map((item) => {
        const locked = item.requireAuth && !isAuthenticated;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            accessibilityState={{ disabled: locked }}
            onPress={() => onPress(item)}
            style={({ pressed }) => [
              styles.row,
              pressed && styles.pressed,
              locked && styles.locked,
            ]}
          >
            <View style={[styles.iconBox, locked && styles.iconBoxLocked]}>
              <Ionicons
                name={item.icon}
                size={18}
                color={locked ? t.color.textSecondary : t.color.brand}
              />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, locked && styles.titleLocked]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.hint} numberOfLines={1}>
                {item.hint}
              </Text>
            </View>
            {locked ? (
              <Ionicons name="lock-closed" size={16} color={t.color.textSecondary} />
            ) : (
              <Ionicons name="chevron-forward" size={16} color={t.color.textSecondary} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  list: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.08)",
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(10, 124, 89, 0.08)",
  },
  pressed: {
    opacity: 0.72,
  },
  locked: {
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
  iconBoxLocked: {
    backgroundColor: t.color.surfaceVariant,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: t.color.text,
  },
  titleLocked: {
    color: t.color.textSecondary,
  },
  hint: {
    fontSize: 11,
    color: t.color.textSecondary,
  },
}));

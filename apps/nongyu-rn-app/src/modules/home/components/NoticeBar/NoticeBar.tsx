import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NoticeBarSkeleton } from "@/components/skeleton/SkeletonBox";
import { useNoticeBootstrap } from "@/modules/home/hooks/useNoticeBootstrap";
import { lightTokens } from "@/theme/tokens";

/**
 * 通知栏：无白底卡片，文案叠在首页背景上
 */
export function NoticeBar() {
  const router = useRouter();
  const { loading, notice } = useNoticeBootstrap();

  if (loading || !notice) {
    return <NoticeBarSkeleton />;
  }

  const display = `【${notice.typeLabel}】${notice.title}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="打开通知"
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      onPress={() => router.push("/home/notice" as Href)}
    >
      <View style={styles.badge}>
        <Ionicons name="megaphone" size={13} color={lightTokens.color.onBrand} />
      </View>
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
        {display}
      </Text>
      <Ionicons name="chevron-forward" size={14} color={lightTokens.color.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: lightTokens.space.md,
    marginTop: 2,
    marginBottom: lightTokens.space.md,
    paddingHorizontal: 2,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 40,
  },
  pressed: {
    opacity: 0.72,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTokens.color.brand,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.1,
    color: lightTokens.color.text,
    backgroundColor: "transparent",
  },
});

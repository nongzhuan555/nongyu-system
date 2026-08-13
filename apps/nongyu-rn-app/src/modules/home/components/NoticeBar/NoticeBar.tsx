import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NoticeBarSkeleton } from "@/components/skeleton/SkeletonBox";
import { HOME_FIELD_CHROME } from "@/modules/home/constants/fieldChrome";
import { useNoticeBootstrap } from "@/modules/home/hooks/useNoticeBootstrap";
import { lightTokens } from "@/theme/tokens";

/**
 * 通知栏：与网站搜索框同形。
 * 铁律：无真实公告时展示 FIXED_NOTICE 占位文案，禁止 return null 整栏隐藏。
 */
export function NoticeBar() {
  const router = useRouter();
  const { loading, notice } = useNoticeBootstrap();

  if (loading) {
    return <NoticeBarSkeleton />;
  }

  // notice 恒有值（真实或占位），此处不再判空隐藏
  const openNotice = () => {
    if (!notice.isPlaceholder && notice.id != null) {
      router.push(`/center/post/${notice.id}` as Href);
      return;
    }
    router.push("/home/notice" as Href);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`打开通知：${notice.title}`}
      style={({ pressed }) => [styles.shell, pressed && styles.pressed]}
      onPress={openNotice}
    >
      <View style={styles.frost} pointerEvents="none" />
      <View style={styles.row}>
        <Ionicons
          name="megaphone-outline"
          size={15}
          color={lightTokens.color.textSecondary}
          style={styles.icon}
        />
        <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
          {notice.title}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={lightTokens.color.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: lightTokens.space.md,
    marginTop: 2,
    marginBottom: lightTokens.space.md,
    height: HOME_FIELD_CHROME.height,
    borderRadius: HOME_FIELD_CHROME.radius,
    overflow: "hidden",
    borderWidth: HOME_FIELD_CHROME.borderWidth,
    borderColor: HOME_FIELD_CHROME.borderColor,
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.72,
  },
  frost: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: HOME_FIELD_CHROME.frost,
  },
  row: {
    flex: 1,
    height: HOME_FIELD_CHROME.height,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: lightTokens.color.text,
    paddingVertical: 0,
    backgroundColor: "transparent",
  },
});

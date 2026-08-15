import { useThemeTokens } from "@/theme/ThemeProvider";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PostFeedList } from "@/modules/center/components/PostFeedList";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 首页公告栏入口：复用广场公告列表（PostFeedList · announcement）
 */
export function AnnouncementListScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={t.color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>公告</Text>
        <View style={styles.headerRight} />
      </View>
      <PostFeedList mode="plaza" postType="announcement" emptyText="暂无公告" />
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space.sm,
    paddingVertical: t.space.xs,
    marginBottom: t.space.xs,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
    letterSpacing: 0.3,
  },
  headerRight: {
    width: 40,
  },
}));

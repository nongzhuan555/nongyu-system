import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TabScreenBackground } from "@/components/navigation/TabScreenBackground";
import type { PostType } from "@/modules/center/api/posts";
import { PostFeedList } from "@/modules/center/components/PostFeedList";
import { SegmentGlassTabs } from "@/modules/center/components/SegmentGlassTabs";
import { lightTokens } from "@/theme/tokens";

const SEGMENTS = [
  { key: "announcement" as const, label: "公告" },
  { key: "feedback" as const, label: "反馈墙" },
  { key: "courtyard" as const, label: "大院" },
];

/**
 * 广场主界面：玻璃分段 + 列表；反馈/大院发帖入口
 */
export function CenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [postType, setPostType] = useState<PostType>("announcement");
  const canCompose = postType === "feedback" || postType === "courtyard";

  return (
    <View style={styles.root}>
      <TabScreenBackground />
      <View style={[styles.body, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>广场</Text>
          {canCompose ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="发帖"
              hitSlop={10}
              onPress={() => router.push(`/center/compose?postType=${postType}` as Href)}
              style={styles.composeBtn}
            >
              <Ionicons name="create-outline" size={22} color={lightTokens.color.brand} />
            </Pressable>
          ) : (
            <View style={styles.composePlaceholder} />
          )}
        </View>

        <View style={styles.segmentsWrap}>
          <SegmentGlassTabs items={SEGMENTS} value={postType} onChange={setPostType} />
        </View>

        <PostFeedList
          key={postType}
          mode="plaza"
          postType={postType}
          withTabBarPadding
          emptyText={
            postType === "announcement"
              ? "暂无公告"
              : postType === "feedback"
                ? "还没有反馈，来第一条吧"
                : "大院还很安静，说点什么吧"
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: lightTokens.color.background,
  },
  body: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: lightTokens.space.lg,
    paddingTop: lightTokens.space.sm,
    paddingBottom: lightTokens.space.md,
  },
  title: {
    fontSize: lightTokens.fontSize.xl,
    fontWeight: "700",
    color: lightTokens.color.text,
    letterSpacing: 0.6,
  },
  composeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: lightTokens.radius.full,
    backgroundColor: lightTokens.color.brandMuted,
  },
  composePlaceholder: {
    width: 40,
    height: 40,
  },
  segmentsWrap: {
    paddingHorizontal: lightTokens.space.md,
    marginBottom: lightTokens.space.md,
  },
});

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TabScreenBackground } from "@/components/navigation/TabScreenBackground";
import type { PostType } from "@/modules/center/api/posts";
import { PostFeedList } from "@/modules/center/components/PostFeedList";
import { SegmentGlassTabs } from "@/modules/center/components/SegmentGlassTabs";
import { HOME_FIELD_CHROME } from "@/modules/home/constants/fieldChrome";
import { lightTokens } from "@/theme/tokens";

const SEGMENTS = [
  { key: "announcement" as const, label: "公告" },
  { key: "feedback" as const, label: "反馈墙" },
  { key: "courtyard" as const, label: "大院" },
];

const KEYWORD_DEBOUNCE_MS = 350;

/**
 * 广场主界面：搜索 + 玻璃分段 + 列表；反馈/大院发帖入口
 */
export function CenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [postType, setPostType] = useState<PostType>("announcement");
  const [keywordDraft, setKeywordDraft] = useState("");
  const [keyword, setKeyword] = useState("");
  const canCompose = postType === "feedback" || postType === "courtyard";

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(keywordDraft.trim());
    }, KEYWORD_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keywordDraft]);

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

        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={lightTokens.color.textSecondary} />
            <TextInput
              value={keywordDraft}
              onChangeText={setKeywordDraft}
              placeholder="搜索标题或正文"
              placeholderTextColor={lightTokens.color.textSecondary}
              returnKeyType="search"
              maxLength={64}
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
            {keywordDraft.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="清空搜索"
                hitSlop={8}
                onPress={() => {
                  setKeywordDraft("");
                  setKeyword("");
                }}
              >
                <Ionicons name="close-circle" size={16} color={lightTokens.color.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.segmentsWrap}>
          <SegmentGlassTabs items={SEGMENTS} value={postType} onChange={setPostType} />
        </View>

        <PostFeedList
          key={`${postType}:${keyword}`}
          mode="plaza"
          postType={postType}
          keyword={keyword}
          withTabBarPadding
          emptyText={
            keyword
              ? "没有匹配的帖子"
              : postType === "announcement"
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
    paddingBottom: lightTokens.space.sm,
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
  searchWrap: {
    paddingHorizontal: lightTokens.space.md,
    marginBottom: lightTokens.space.sm,
  },
  searchBox: {
    height: HOME_FIELD_CHROME.height,
    borderRadius: HOME_FIELD_CHROME.radius,
    borderWidth: HOME_FIELD_CHROME.borderWidth,
    borderColor: HOME_FIELD_CHROME.borderColor,
    backgroundColor: HOME_FIELD_CHROME.frost,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: lightTokens.color.text,
    paddingVertical: 0,
  },
  segmentsWrap: {
    paddingHorizontal: lightTokens.space.md,
    marginBottom: lightTokens.space.md,
  },
});

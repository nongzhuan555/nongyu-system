import { useThemeTokens } from "@/theme/ThemeProvider";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TabScreenBackground } from "@/components/navigation/TabScreenBackground";
import type { PostType } from "@/modules/center/api/posts";
import { PostFeedList } from "@/modules/center/components/PostFeedList";
import { SegmentGlassTabs } from "@/modules/center/components/SegmentGlassTabs";
import { HOME_FIELD_CHROME } from "@/modules/home/constants/fieldChrome";
import { createThemedStyles } from "@/theme/createThemedStyles";

const SEGMENTS = [
  { key: "announcement" as const, label: "公告" },
  { key: "feedback" as const, label: "反馈墙" },
  { key: "courtyard" as const, label: "大院" },
];

const KEYWORD_DEBOUNCE_MS = 350;

function parsePostTypeParam(value: string | string[] | undefined): PostType | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "announcement" || raw === "feedback" || raw === "courtyard") return raw;
  return null;
}

/**
 * 广场主界面：搜索 + 玻璃分段 + 列表；反馈/大院发帖入口
 * 可选 query：`postType`（设置页等深链切到反馈墙等）
 */
export function CenterScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { postType: postTypeParam } = useLocalSearchParams<{ postType?: string | string[] }>();
  const [postType, setPostType] = useState<PostType>(
    () => parsePostTypeParam(postTypeParam) ?? "announcement",
  );
  const [keywordDraft, setKeywordDraft] = useState("");
  const [keyword, setKeyword] = useState("");
  const canCompose = postType === "feedback" || postType === "courtyard";

  // Tab 常驻挂载：深链进入时同步分段
  useEffect(() => {
    const next = parsePostTypeParam(postTypeParam);
    if (next) setPostType(next);
  }, [postTypeParam]);

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
              <Ionicons name="create-outline" size={22} color={t.color.brand} />
            </Pressable>
          ) : (
            <View style={styles.composePlaceholder} />
          )}
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={t.color.textSecondary} />
            <TextInput
              value={keywordDraft}
              onChangeText={setKeywordDraft}
              placeholder="搜索标题或正文"
              placeholderTextColor={t.color.textSecondary}
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
                <Ionicons name="close-circle" size={16} color={t.color.textSecondary} />
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

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  body: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.sm,
    paddingBottom: t.space.sm,
  },
  title: {
    fontSize: t.fontSize.xl,
    fontWeight: "700",
    color: t.color.text,
    letterSpacing: 0.6,
  },
  composeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: t.radius.full,
    backgroundColor: t.color.brandMuted,
  },
  composePlaceholder: {
    width: 40,
    height: 40,
  },
  searchWrap: {
    paddingHorizontal: t.space.md,
    marginBottom: t.space.sm,
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
    color: t.color.text,
    paddingVertical: 0,
  },
  segmentsWrap: {
    paddingHorizontal: t.space.md,
    marginBottom: t.space.md,
  },
}));

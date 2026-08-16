import { useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { ScrollToTopFab, useScrollToTopVisibility } from "@/components/ui/ScrollToTopFab";
import { JiaowuListSkeleton } from "./JiaowuListSkeleton";
import { JiaowuErrorView } from "./JiaowuErrorView";
import { JiaowuEmptyView } from "./JiaowuEmptyView";
import { ExamScheduleList } from "./ExamScheduleList";
import { useExamSchedule } from "../hooks/useExamSchedule";

/**
 * 课表 Tab 内嵌的考试安排面板（自带搜索与下拉刷新，无教务返回顶栏）
 */
export function ExamSchedulePanel() {
  const styles = useStyles();
  const t = useThemeTokens();
  const scrollRef = useRef<ScrollView>(null);
  const { visible: showScrollTop, onScroll: onScrollTopVisibility } = useScrollToTopVisibility();
  const exam = useExamSchedule();

  const onPressScrollTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    exam.refresh();
  }, [exam.refresh]);

  const loading = exam.isPending && !exam.data;
  const error = exam.isError && !exam.data;
  const empty = (!!exam.data && exam.list.length === 0) || exam.noSearchHit;
  const emptyText = exam.noSearchHit ? "未找到相关结果" : "暂无考试安排";
  const showSearch = exam.hasData && !loading && !error;

  let body = <ExamScheduleList items={exam.filtered} />;
  if (loading) body = <JiaowuListSkeleton />;
  else if (error) {
    body = (
      <JiaowuErrorView
        onRetry={exam.refresh}
        message={exam.error instanceof Error ? exam.error.message : undefined}
      />
    );
  } else if (empty) body = <JiaowuEmptyView text={emptyText} />;

  return (
    <View style={styles.root}>
      {exam.isFetching && exam.hasData && !exam.isRefetching ? (
        <View style={styles.fetchingBar}>
          <ActivityIndicator size="small" color={t.color.brand} />
          <Text style={styles.fetchingText}>更新中…</Text>
        </View>
      ) : null}

      {showSearch ? (
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={t.color.textSecondary} />
            <TextInput
              value={exam.draft}
              onChangeText={exam.setDraft}
              placeholder="搜索课程、考场、时间…"
              placeholderTextColor={t.color.textSecondary}
              accessibilityLabel="搜索课程、考场、时间…"
              returnKeyType="search"
              maxLength={64}
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
            {exam.searching ? <ActivityIndicator size="small" color={t.color.brand} /> : null}
            {exam.draft.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="清空搜索"
                hitSlop={8}
                onPress={() => exam.setDraft("")}
              >
                <Ionicons name="close-circle" size={16} color={t.color.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.listHost}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onScroll={onScrollTopVisibility}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={exam.isRefetching}
              onRefresh={exam.refresh}
              tintColor={t.color.brand}
              colors={[t.color.brand]}
            />
          }
        >
          {body}
        </ScrollView>
        <ScrollToTopFab visible={showScrollTop} onPress={onPressScrollTop} placement="stack" />
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
  },
  listHost: {
    flex: 1,
  },
  content: {
    paddingHorizontal: t.space.md,
    paddingBottom: t.space.xl,
    flexGrow: 1,
  },
  fetchingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 4,
  },
  fetchingText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
  searchWrap: {
    paddingHorizontal: t.space.md,
    marginBottom: t.space.sm,
  },
  searchBox: {
    height: 40,
    borderRadius: t.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: t.fontSize.sm,
    color: t.color.text,
    paddingVertical: 0,
  },
}));

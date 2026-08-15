import { Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { getCompetitionInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useDeferredLocalSearch } from "@/modules/jiaowu/hooks/useDeferredLocalSearch";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { matchSearchQuery } from "@/modules/jiaowu/utils/search";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 竞赛通知列表页
 */
export function CompetitionScreen() {
  const styles = useStyles();
  const { data, isPending, isError, error, isFetching, isRefetching, refresh } = useJiaowuQuery({
    resource: "competition",
    requireAuth: false,
    queryFn: getCompetitionInfo,
  });
  const { draft, setDraft, query, searching } = useDeferredLocalSearch();

  const list = data ?? [];
  const hasData = list.length > 0;
  const filtered = list.filter((item) => matchSearchQuery(query, item.title, item.date));
  const noSearchHit = hasData && !searching && query.trim().length > 0 && filtered.length === 0;

  return (
    <JiaowuPageShell
      title="竞赛通知"
      loading={isPending && !data}
      error={isError && !data}
      errorMessage={error instanceof Error ? error.message : undefined}
      empty={(!!data && list.length === 0) || noSearchHit}
      emptyText={noSearchHit ? "未找到相关结果" : "暂无竞赛通知"}
      onRetry={refresh}
      refreshing={isRefetching}
      onRefresh={refresh}
      fetchingHint={isFetching && hasData && !isRefetching}
      search={
        hasData
          ? {
              value: draft,
              onChangeText: setDraft,
              placeholder: "搜索竞赛标题、日期",
              searching,
            }
          : undefined
      }
    >
      <View style={styles.list}>
        {filtered.map((item, index) => (
          <Pressable
            key={`${item.url}-${index}`}
            accessibilityRole="link"
            onPress={() => {
              if (item.url) void WebBrowser.openBrowserAsync(item.url);
            }}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.date ? <Text style={styles.date}>{item.date}</Text> : null}
          </Pressable>
        ))}
      </View>
    </JiaowuPageShell>
  );
}

const useStyles = createThemedStyles((t) => ({
  list: {
    gap: t.space.sm,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.md,
    padding: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    gap: 6,
  },
  pressed: {
    opacity: 0.75,
  },
  cardTitle: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
    lineHeight: 22,
  },
  date: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
}));

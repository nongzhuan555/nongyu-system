import { Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { getTeachingNoticeInfo } from "nongyu-tool-jiaowu";
import { JiaowuPageShell } from "@/modules/jiaowu/components/JiaowuPageShell";
import { useJiaowuQuery } from "@/modules/jiaowu/hooks/useJiaowuQuery";
import { lightTokens } from "@/theme/tokens";

/**
 * 教学通知列表页
 */
export function NoticeScreen() {
  const { data, isPending, isError, error, isFetching, isRefetching, refresh } = useJiaowuQuery({
    resource: "notice",
    requireAuth: false,
    queryFn: getTeachingNoticeInfo,
  });

  const list = data ?? [];
  const hasData = list.length > 0;

  return (
    <JiaowuPageShell
      title="教务通知"
      loading={isPending && !data}
      error={isError && !data}
      errorMessage={error instanceof Error ? error.message : undefined}
      empty={!!data && list.length === 0}
      emptyText="暂无教学通知"
      onRetry={refresh}
      refreshing={isRefetching}
      onRefresh={refresh}
      fetchingHint={isFetching && hasData && !isRefetching}
    >
      <View style={styles.list}>
        {list.map((item, index) => (
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

const styles = StyleSheet.create({
  list: {
    gap: lightTokens.space.sm,
  },
  card: {
    backgroundColor: lightTokens.color.surface,
    borderRadius: lightTokens.radius.md,
    padding: lightTokens.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
    gap: 6,
  },
  pressed: {
    opacity: 0.75,
  },
  cardTitle: {
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
    color: lightTokens.color.text,
    lineHeight: 22,
  },
  date: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
  },
});

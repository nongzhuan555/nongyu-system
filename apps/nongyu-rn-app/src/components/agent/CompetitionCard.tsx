import { createThemedStyles } from "@/theme/createThemedStyles";
import { Href, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { getCompetitionInfo } from "nongyu-tool-jiaowu";
import type { ToolRenderProps } from "@/agent-ui/registry";

type CompetitionResult = Awaited<ReturnType<typeof getCompetitionInfo>>;

function CompetitionCardInner({ output, status, error }: ToolRenderProps<{}, CompetitionResult>) {
  const styles = useStyles();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询竞赛通知失败"}</Text>
      </View>
    );
  }

  if (!output.success || !Array.isArray(output.result) || output.result.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>暂无竞赛通知</Text>
      </View>
    );
  }

  const list = output.result.slice(0, 5);
  const hasMore = output.result.length > 5;
  const router = useRouter();

  const openUrl = (url?: string) => {
    if (url) void WebBrowser.openBrowserAsync(url);
  };

  const navigate = () => router.push("/home/jiaowu/competition" as Href);

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>竞赛通知</Text>
      <View style={styles.list}>
        {list.map((item, index) => (
          <Pressable
            key={`${item.url ?? item.title}-${index}`}
            accessibilityRole="link"
            onPress={() => openUrl(item.url)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title || "未命名竞赛"}
            </Text>
            {item.date ? <Text style={styles.date}>{item.date}</Text> : null}
          </Pressable>
        ))}
      </View>
      {hasMore ? (
        <Pressable accessibilityRole="button" style={styles.moreBtn} onPress={navigate}>
          <Text style={styles.moreText}>查看全部 ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const CompetitionCard = memo(CompetitionCardInner);

const useStyles = createThemedStyles((t) => ({
  root: {
    width: "100%",
  },
  headerTitle: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
    marginBottom: t.space.sm,
  },
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
  moreBtn: {
    alignSelf: "flex-start",
    marginTop: t.space.sm,
    paddingHorizontal: t.space.sm,
    paddingVertical: t.space.xs,
    borderRadius: t.radius.full,
    backgroundColor: t.color.brandMuted,
  },
  moreText: {
    fontSize: t.fontSize.sm,
    color: t.color.brand,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: t.color.surfaceVariant,
  },
  emptyText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  errorText: {
    fontSize: t.fontSize.sm,
    color: t.color.danger,
  },
}));

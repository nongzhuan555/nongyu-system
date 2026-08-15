import { createThemedStyles } from "@/theme/createThemedStyles";
import { Href, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getScoreInfo } from "nongyu-tool-jiaowu";
import type { ToolRenderProps } from "@/agent-ui/registry";

type ScoreResult = Awaited<ReturnType<typeof getScoreInfo>>;
type ScoreRow = ScoreResult["result"][number];

function groupByTerm(items: ScoreRow[]): { term: string; items: ScoreRow[] }[] {
  const map = new Map<string, ScoreRow[]>();
  for (const item of items) {
    const term = item.term || "未知学期";
    const bucket = map.get(term);
    if (bucket) bucket.push(item);
    else map.set(term, [item]);
  }
  return Array.from(map.entries())
    .map(([term, group]) => ({ term, items: group }))
    .sort((a, b) => b.term.localeCompare(a.term));
}

function ScoreCardInner({ output, status, error }: ToolRenderProps<{}, ScoreResult>) {
  const styles = useStyles();
  const router = useRouter();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询成绩失败"}</Text>
      </View>
    );
  }

  if (!output.success || !Array.isArray(output.result) || output.result.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>暂无成绩</Text>
      </View>
    );
  }

  const groups = groupByTerm(output.result).slice(0, 2);
  const totalShown = groups.reduce((acc, g) => acc + g.items.slice(0, 3).length, 0);
  const hasMore = output.result.length > totalShown;

  const navigate = () => router.push("/home/jiaowu/score" as Href);

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>成绩</Text>
      <View style={styles.list}>
        {groups.map((group) => (
          <View key={group.term} style={styles.group}>
            <Text style={styles.term}>{group.term}</Text>
            {group.items.slice(0, 3).map((item, index) => (
              <Pressable
                key={`${item.courseName}-${index}`}
                accessibilityRole="button"
                onPress={navigate}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.course} numberOfLines={2}>
                    {item.courseName || "未命名课程"}
                  </Text>
                  <Text style={styles.score}>{item.score ?? "-"}</Text>
                </View>
                <Text style={styles.meta}>
                  {[
                    item.credit ? `${item.credit} 学分` : null,
                    item.gradePoint ? `绩点 ${item.gradePoint}` : null,
                    item.courseType,
                    item.source,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </Pressable>
            ))}
          </View>
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

export const ScoreCard = memo(ScoreCardInner);

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
    gap: t.space.md,
  },
  group: {
    gap: t.space.sm,
  },
  term: {
    fontSize: t.fontSize.sm,
    fontWeight: "700",
    color: t.color.brand,
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
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  course: {
    flex: 1,
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
    lineHeight: 22,
  },
  score: {
    fontSize: t.fontSize.lg,
    fontWeight: "700",
    color: t.color.brand,
  },
  meta: {
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

import { createThemedStyles } from "@/theme/createThemedStyles";
import { Href, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getRankInfo } from "nongyu-tool-jiaowu";
import type { ToolRenderProps } from "@/agent-ui/registry";

type RankResult = Awaited<ReturnType<typeof getRankInfo>>;

function RankCardInner({ output, status, error }: ToolRenderProps<{}, RankResult>) {
  const styles = useStyles();
  const router = useRouter();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.panel, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询专业排名失败"}</Text>
      </View>
    );
  }

  if (!output.success || !output.result) {
    return (
      <View style={[styles.panel, styles.emptyCard]}>
        <Text style={styles.emptyText}>暂无排名数据</Text>
      </View>
    );
  }

  const data = output.result;
  const meta = [data.campus, data.college, data.major, data.className, data.grade]
    .filter(Boolean)
    .join(" · ");

  const navigate = () => router.push("/home/jiaowu/rank" as Href);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={navigate}
      style={({ pressed }) => [styles.panel, pressed && styles.pressed]}
    >
      <View style={styles.identity}>
        <Text style={styles.name}>
          {data.name || "同学"}
          {data.studentId ? ` · ${data.studentId}` : ""}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.hero}>
        <Text style={styles.rankNumber}>{data.majorRank?.trim() ? data.majorRank : "-"}</Text>
        <Text style={styles.rankCaption}>专业排名 · 名</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>加权成绩</Text>
          <Text style={styles.metricValue}>
            {data.weightedScore?.trim() ? data.weightedScore : "-"}
          </Text>
        </View>
        <View style={styles.metricRule} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>学籍</Text>
          <Text style={styles.metricValue}>{data.status?.trim() ? data.status : "-"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export const RankCard = memo(RankCardInner);

const useStyles = createThemedStyles((t) => ({
  panel: {
    width: "100%",
    backgroundColor: t.color.brandMuted,
    borderRadius: t.radius.lg,
    paddingVertical: t.space.lg,
    paddingHorizontal: t.space.md,
    gap: t.space.lg,
  },
  pressed: {
    opacity: 0.75,
  },
  identity: {
    gap: 6,
  },
  name: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.brand,
    letterSpacing: 0.2,
  },
  meta: {
    fontSize: 12,
    lineHeight: 18,
    color: t.color.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
  },
  hero: {
    alignItems: "center",
    paddingVertical: t.space.sm,
    gap: t.space.sm,
  },
  rankNumber: {
    fontSize: 48,
    fontWeight: "700",
    color: t.color.brand,
    letterSpacing: -1,
    lineHeight: 56,
    fontVariant: ["tabular-nums"],
  },
  rankCaption: {
    fontSize: 12,
    fontWeight: "500",
    color: t.color.textSecondary,
    letterSpacing: 2,
  },
  metrics: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingTop: t.space.xs,
  },
  metric: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: t.space.sm,
  },
  metricRule: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
    alignSelf: "stretch",
  },
  metricLabel: {
    fontSize: 11,
    color: t.color.textSecondary,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
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

import { createThemedStyles } from "@/theme/createThemedStyles";
import { Href, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getProgressInfo } from "nongyu-tool-jiaowu";
import type { ToolRenderProps } from "@/agent-ui/registry";

type ProgressResult = Awaited<ReturnType<typeof getProgressInfo>>;
type ProgressRow = ProgressResult["result"][number];

function parseProgressPercent(value?: string): number | null {
  if (!value) return null;
  const num = Number.parseFloat(value.replace("%", ""));
  return Number.isNaN(num) ? null : num;
}

function ProgressCardInner({ output, status, error }: ToolRenderProps<{}, ProgressResult>) {
  const styles = useStyles();
  const router = useRouter();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询学业进度失败"}</Text>
      </View>
    );
  }

  if (!output.success || !Array.isArray(output.result) || output.result.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>暂无学业进度数据</Text>
      </View>
    );
  }

  const list = output.result.slice(0, 5);
  const hasMore = output.result.length > 5;

  const navigate = () => router.push("/home/jiaowu/progress" as Href);

  const renderItem = (item: ProgressRow, index: number) => {
    const percent = parseProgressPercent(item.progress);
    return (
      <Pressable
        key={`${item.type ?? index}-${index}`}
        accessibilityRole="button"
        onPress={navigate}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <Text style={styles.type}>{item.type?.replace(/\n/g, " ") || "未知类型"}</Text>
        <View style={styles.row}>
          <Meta label="应修" value={item.required} />
          <Meta label="已修" value={item.earned?.replace(/\n/g, " ")} />
          <Meta label="进度" value={item.progress} highlight />
        </View>
        {percent != null ? (
          <View style={styles.track} accessibilityRole="progressbar">
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, percent))}%` }]} />
          </View>
        ) : null}
        <Text style={styles.diff}>
          学分差 {item.diff} · 可结转 {item.transfer}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>学业进度</Text>
      <View style={styles.list}>{list.map(renderItem)}</View>
      {hasMore ? (
        <Pressable accessibilityRole="button" style={styles.moreBtn} onPress={navigate}>
          <Text style={styles.moreText}>查看全部 ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Meta({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, highlight && styles.highlight]} numberOfLines={2}>
        {value ?? "-"}
      </Text>
    </View>
  );
}

export const ProgressCard = memo(ProgressCardInner);

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
    gap: 10,
  },
  pressed: {
    opacity: 0.75,
  },
  type: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
  },
  row: {
    flexDirection: "row",
    gap: t.space.sm,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: t.color.textSecondary,
  },
  metaValue: {
    fontSize: t.fontSize.sm,
    color: t.color.text,
    fontWeight: "600",
  },
  highlight: {
    color: t.color.brand,
  },
  track: {
    height: 7,
    borderRadius: 999,
    backgroundColor: t.color.border,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: t.color.brand,
  },
  diff: {
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

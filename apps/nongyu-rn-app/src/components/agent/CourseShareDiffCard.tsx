import { createThemedStyles } from "@/theme/createThemedStyles";
import { type Href, useRouter } from "expo-router";
import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ToolRenderProps } from "@/agent-ui/registry";
import type { CourseShareDiffResult } from "@/modules/course/agent/courseShareTools";
import { openCourseShareDiff } from "@/modules/course/data/openCourseShareDiff";
import type { DiffSlotSummary, DiffWeekCounts } from "@/modules/course/model/courseShareDiff";

const SLOT_LIMIT = 8;
const WEEK_LIMIT = 8;

type DiffArgs = {
  studentNo: string;
  week?: number;
  weeks?: "all";
  mode?: "conflict" | "free" | "both";
};

function formatUpdatedAt(iso: string): string {
  const sliced = iso.slice(0, 16).replace("T", " ");
  return sliced || iso;
}

function SlotList({
  title,
  slots,
  emptyText,
}: {
  title: string;
  slots: DiffSlotSummary[];
  emptyText: string;
}) {
  const styles = useStyles();
  const shown = slots.slice(0, SLOT_LIMIT);
  const rest = slots.length - shown.length;
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {shown.length === 0 ? (
        <Text style={styles.emptyLine}>{emptyText}</Text>
      ) : (
        shown.map((s) => (
          <Text key={s.label} style={styles.slotLine}>
            {s.label}
          </Text>
        ))
      )}
      {rest > 0 ? <Text style={styles.moreLine}>还有 {rest} 个时段，打开课表查看</Text> : null}
    </View>
  );
}

function WeekCountList({ rows }: { rows: DiffWeekCounts[] }) {
  const styles = useStyles();
  const shown = rows.slice(0, WEEK_LIMIT);
  const rest = rows.length - shown.length;
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>各周汇总</Text>
      {shown.map((row) => (
        <Text key={row.week} style={styles.slotLine}>
          第{row.week}周 · 冲突 {row.conflictCount} · 空档 {row.freeCount}
        </Text>
      ))}
      {rest > 0 ? <Text style={styles.moreLine}>还有 {rest} 周，打开课表查看</Text> : null}
    </View>
  );
}

function CourseShareDiffCardInner({
  output,
  status,
  error,
}: ToolRenderProps<DiffArgs, CourseShareDiffResult>) {
  const styles = useStyles();
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "未找到可查看的课表"}</Text>
      </View>
    );
  }

  const showConflict = output.mode === "conflict" || output.mode === "both";
  const showFree = output.mode === "free" || output.mode === "both";
  const openMode = output.mode === "free" ? "free" : "conflict";
  const weekLabel = output.scope === "all" ? "整学期" : `第${output.week}周`;

  const onOpen = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const ok = await openCourseShareDiff({
        studentNo: output.studentNo,
        week: output.week,
        diffMode: openMode,
      });
      if (ok) router.push("/course" as Href);
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>
        对比 {output.studentNo} · {weekLabel}
      </Text>
      <Text style={styles.meta}>更新于 {formatUpdatedAt(output.updatedAt)}</Text>
      {output.scope === "all" && output.weekCounts ? (
        <WeekCountList rows={output.weekCounts} />
      ) : (
        <>
          {showConflict ? (
            <SlotList
              title={`冲突 ${output.counts.conflict}`}
              slots={output.conflictSlots}
              emptyText="本周没有双方同时有课的时段"
            />
          ) : null}
          {showFree ? (
            <SlotList
              title={`空档 ${output.counts.free}`}
              slots={output.freeSlots}
              emptyText="本周没有双方都空的时段"
            />
          ) : null}
        </>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="在课表中打开对比"
        disabled={opening}
        onPress={() => void onOpen()}
        style={({ pressed }) => [styles.moreBtn, pressed && styles.pressed]}
      >
        <Text style={styles.moreText}>{opening ? "打开中…" : "在课表中打开对比 ›"}</Text>
      </Pressable>
    </View>
  );
}

export const CourseShareDiffCard = memo(CourseShareDiffCardInner);

const useStyles = createThemedStyles((t) => ({
  root: {
    width: "100%",
  },
  headerTitle: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    marginBottom: t.space.sm,
  },
  block: {
    marginBottom: t.space.sm,
    gap: 4,
  },
  blockTitle: {
    fontSize: t.fontSize.sm,
    fontWeight: "700",
    color: t.color.text,
  },
  slotLine: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 20,
  },
  emptyLine: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
  moreLine: {
    fontSize: t.fontSize.sm,
    color: t.color.brand,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.md,
    padding: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  pressed: {
    opacity: 0.75,
  },
  moreBtn: {
    alignSelf: "flex-start",
    marginTop: t.space.xs,
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
  errorCard: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  errorText: {
    fontSize: t.fontSize.sm,
    color: t.color.danger,
  },
}));

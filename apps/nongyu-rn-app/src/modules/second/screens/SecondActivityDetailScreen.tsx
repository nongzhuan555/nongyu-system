import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getActivityDetail } from "nongyu-tool-second";
import { SecondAppBar } from "@/modules/second/components/SecondAppBar";
import { SecondDetailSkeleton } from "@/modules/second/components/SecondSkeletons";
import { SecondSurface } from "@/modules/second/components/SecondSurface";
import { useSecondQuery } from "@/modules/second/hooks/useSecondQuery";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 活动详情：主题色简约信息卡；底栏只读状态
 */
export function SecondActivityDetailScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actId = id ?? "";

  const { data, isPending, isError, error, isSecondAuthed, refresh } = useSecondQuery({
    resource: `activity-${actId}`,
    requireAuth: true,
    queryFn: () => getActivityDetail(actId),
    staleTime: 5 * 60 * 1000,
  });

  const detail = data as Record<string, unknown> | undefined;

  if (!actId || !isSecondAuthed) {
    return (
      <View style={styles.root}>
        <SecondAppBar title="活动详情" />
        <View style={styles.center}>
          <Text style={styles.muted}>{!actId ? "缺少活动 id" : "请先在二课首页登录"}</Text>
        </View>
      </View>
    );
  }

  if (isPending && !data) {
    return (
      <View style={styles.root}>
        <SecondAppBar title="活动详情" />
        <SecondDetailSkeleton />
      </View>
    );
  }

  if ((isError && !data) || !detail) {
    return (
      <View style={styles.root}>
        <SecondAppBar title="活动详情" />
        <View style={styles.center}>
          <Text style={styles.muted}>
            {error instanceof Error ? error.message : "未找到活动详情"}
          </Text>
          <Pressable onPress={refresh} style={styles.retry}>
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusName = String(detail.statusName ?? "暂不可操作");

  return (
    <View style={styles.root}>
      <SecondAppBar title="活动详情" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{String(detail.title ?? "")}</Text>

        <View style={styles.chips}>
          {detail.typeName ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{String(detail.typeName)}</Text>
            </View>
          ) : null}
          {detail.groupName ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{String(detail.groupName)}</Text>
            </View>
          ) : null}
          {detail.statusName ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{String(detail.statusName)}</Text>
            </View>
          ) : null}
        </View>

        <SecondSurface style={styles.card}>
          <Text style={styles.sectionTitle}>活动信息</Text>
          <Text style={styles.infoRow}>
            时间：{String(detail.startTime ?? "-")} ~ {String(detail.endTime ?? "-")}
          </Text>
          <Text style={styles.infoRow}>地点：{String(detail.addr ?? "-")}</Text>
          <Text style={styles.infoRow}>
            人数：{String(detail.activityMemberCounts ?? "-")} /{" "}
            {String(detail.allowUserCount ?? "-")}
          </Text>
          {detail.signupStartTime || detail.signupEndTime ? (
            <Text style={styles.infoRow}>
              报名：{String(detail.signupStartTime ?? "-")} ~ {String(detail.signupEndTime ?? "-")}
            </Text>
          ) : null}
        </SecondSurface>

        <SecondSurface style={styles.card}>
          <Text style={styles.sectionTitle}>活动介绍</Text>
          <Text style={styles.description} selectable>
            {String(detail.description ?? "暂无介绍")}
          </Text>
        </SecondSurface>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.statusBtn}>
          <Text style={styles.statusBtnText}>{statusName} · 请去i川农app报名</Text>
        </View>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: { flex: 1, backgroundColor: t.color.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  muted: { color: t.color.textSecondary, textAlign: "center" },
  retry: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: t.radius.md,
    backgroundColor: t.color.brandMuted,
  },
  retryText: { color: t.color.brand, fontWeight: "700" },
  scroll: { padding: 16 },
  title: {
    fontWeight: "700",
    marginBottom: 12,
    fontSize: 20,
    lineHeight: 28,
    color: t.color.text,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, gap: 8 },
  chip: {
    backgroundColor: t.color.brandMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { color: t.color.brand, fontSize: 12, fontWeight: "600" },
  card: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    color: t.color.brand,
  },
  infoRow: {
    marginBottom: 4,
    color: t.color.textSecondary,
    fontSize: t.fontSize.sm,
    lineHeight: 20,
  },
  description: {
    lineHeight: 22,
    color: t.color.text,
    fontSize: t.fontSize.sm,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(10, 124, 89, 0.10)",
    backgroundColor: t.color.surface,
  },
  statusBtn: {
    height: 48,
    borderRadius: t.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.brandMuted,
  },
  statusBtnText: {
    color: t.color.brand,
    fontWeight: "600",
  },
}));

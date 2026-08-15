import { createThemedStyles } from "@/theme/createThemedStyles";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import type { ListActivitiesParams, SecondResult } from "nongyu-tool-second";
import { SecondSurface } from "@/modules/second/components/SecondSurface";
import type { ToolRenderProps } from "@/agent-ui/registry";

interface ActItem {
  id?: number;
  title?: string;
  logo?: string;
  typeName?: string;
  addr?: string;
  startTime?: string;
  statusName?: string;
}

type SecondActivityOutput =
  | SecondResult<ActItem[]>
  | { success: false; needsAuth: true; result: ActItem[]; message: string };

/**
 * 二课活动列表卡片：在 AI 对话内联渲染。
 *
 * 执行态不展示骨架屏，避免与最终卡片/文案之间出现多余占位。
 * 点击活动项 → 直接跳转活动详情页。
 */
function SecondActivityListCardInner({
  args,
  output,
  status,
  error,
  onAction,
}: ToolRenderProps<ListActivitiesParams, SecondActivityOutput>) {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询二课活动失败"}</Text>
      </View>
    );
  }

  if (!output.success && "needsAuth" in output && output.needsAuth) {
    return (
      <View style={[styles.card, styles.authCard]}>
        <Ionicons name="lock-closed-outline" size={32} color={t.color.brand} />
        <Text style={styles.authTitle}>需要登录二课</Text>
        <Text style={styles.authHint}>
          {output.message || "查询二课活动前需要先登录 i川农系统"}
        </Text>
        <View style={styles.authActions}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.authBtn, pressed && styles.pressed]}
            onPress={() => router.push("/home/second/login?returnTo=/ai")}
          >
            <Text style={styles.authBtnText}>去登录</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.authBtnSecondary, pressed && styles.pressed]}
            onPress={() => onAction?.("暂不登录")}
          >
            <Text style={styles.authBtnSecondaryText}>暂不登录</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!output.success || !Array.isArray(output.result) || output.result.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>
          暂无相关二课活动{args?.actName ? `（关键词：${args.actName}）` : ""}
        </Text>
      </View>
    );
  }

  const list = output.result.slice(0, 5);

  const renderItem = (item: ActItem, index: number) => (
    <Pressable
      key={item.id ?? index}
      accessibilityRole="button"
      accessibilityLabel={`查看活动：${item.title ?? "未命名活动"}`}
      style={({ pressed }) => [styles.activityWrap, pressed && styles.pressed]}
      onPress={() => {
        if (item.id == null) return;
        router.push(`/home/second/activities/${item.id}` as Href);
      }}
    >
      <SecondSurface style={styles.activityCard} padded={false}>
        <View style={styles.activityInner}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.logo} contentFit="cover" />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Ionicons name="image-outline" size={24} color={t.color.textSecondary} />
            </View>
          )}
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle} numberOfLines={2}>
              {item.title ?? "未命名活动"}
            </Text>
            <View style={styles.chipRow}>
              {item.typeName ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{item.typeName}</Text>
                </View>
              ) : null}
              {item.statusName ? (
                <View style={[styles.chip, styles.chipMuted]}>
                  <Text style={styles.chipTextMuted}>{item.statusName}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.info} numberOfLines={1}>
              时间 · {item.startTime || "-"}
            </Text>
            <Text style={styles.info} numberOfLines={1}>
              地点 · {item.addr || "-"}
            </Text>
          </View>
        </View>
      </SecondSurface>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.headerTitle}>二课活动</Text>
      <View style={styles.list}>{list.map(renderItem)}</View>
      {output.result.length > 5 ? (
        <Pressable
          accessibilityRole="button"
          style={styles.moreBtn}
          onPress={() => onAction?.("查看更多二课活动")}
        >
          <Text style={styles.moreText}>查看更多 ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const SecondActivityListCard = memo(SecondActivityListCardInner);

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
  activityWrap: {
    width: "100%",
  },
  activityCard: {
    overflow: "hidden",
  },
  activityInner: {
    flexDirection: "row",
    padding: t.space.sm,
  },
  pressed: {
    opacity: 0.92,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: t.radius.md,
    backgroundColor: t.color.brandMuted,
  },
  logoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
    marginLeft: t.space.sm,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  activityTitle: {
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 20,
    color: t.color.text,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
    gap: 4,
  },
  chip: {
    backgroundColor: t.color.brandMuted,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipMuted: {
    backgroundColor: t.color.surfaceVariant,
  },
  chipText: {
    fontSize: 10,
    color: t.color.brand,
    fontWeight: "600",
  },
  chipTextMuted: {
    fontSize: 10,
    color: t.color.textSecondary,
    fontWeight: "600",
  },
  info: {
    fontSize: 11,
    color: t.color.textSecondary,
  },
  card: {
    padding: t.space.md,
    borderRadius: t.radius.lg,
    backgroundColor: t.color.brandMuted,
  },
  errorCard: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  errorText: {
    fontSize: t.fontSize.sm,
    color: t.color.danger,
  },
  authCard: {
    alignItems: "center",
    padding: t.space.md,
    borderRadius: t.radius.lg,
    backgroundColor: t.color.brandMuted,
    gap: t.space.sm,
  },
  authTitle: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
  },
  authHint: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  authActions: {
    flexDirection: "row",
    gap: t.space.sm,
    marginTop: t.space.xs,
  },
  authBtn: {
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    borderRadius: t.radius.full,
    backgroundColor: t.color.brand,
  },
  authBtnSecondary: {
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    borderRadius: t.radius.full,
    backgroundColor: t.color.surfaceVariant,
  },
  authBtnText: {
    fontSize: t.fontSize.sm,
    fontWeight: "600",
    color: t.color.onBrand,
  },
  authBtnSecondaryText: {
    fontSize: t.fontSize.sm,
    fontWeight: "600",
    color: t.color.textSecondary,
  },
  emptyCard: {
    backgroundColor: t.color.surfaceVariant,
  },
  emptyText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    textAlign: "center",
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
}));

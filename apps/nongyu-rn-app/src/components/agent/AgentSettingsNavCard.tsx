import { createThemedStyles } from "@/theme/createThemedStyles";
import { Href, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ToolRenderProps } from "@/agent-ui/registry";

/**
 * 平台模型排队繁忙时的 A2UI 入口：跳转 Agent 设置配置自有 API Key。
 */
function AgentSettingsNavCardInner({ status }: ToolRenderProps) {
  const styles = useStyles();
  const router = useRouter();

  if (status !== "done") return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="去配置大模型 API Key"
      onPress={() => router.push("/mine/settings/agent" as Href)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>配置自有 API Key</Text>
          <Text style={styles.hint}>前往 Agent 设置，使用更稳定的大模型服务</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

export const AgentSettingsNavCard = memo(AgentSettingsNavCardInner);

const useStyles = createThemedStyles((t) => ({
  card: {
    width: "100%",
    backgroundColor: t.color.surfaceVariant,
    borderRadius: t.radius.lg,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  pressed: {
    opacity: 0.75,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.brand,
  },
  hint: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 22,
    color: t.color.textSecondary,
    lineHeight: 24,
  },
}));

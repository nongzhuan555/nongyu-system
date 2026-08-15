import { createThemedStyles } from "@/theme/createThemedStyles";
import { Href, useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { getPersonalInfo } from "nongyu-tool-jiaowu";
import type { ToolRenderProps } from "@/agent-ui/registry";

type PersonalInfoResult = Awaited<ReturnType<typeof getPersonalInfo>>;

function PersonalInfoCardInner({ output, status, error }: ToolRenderProps<{}, PersonalInfoResult>) {
  const styles = useStyles();
  const router = useRouter();

  if (status === "executing" || !output) {
    return null;
  }

  if (status === "error") {
    return (
      <View style={[styles.root, styles.errorCard]}>
        <Text style={styles.errorText}>⚠ {error ?? "查询个人信息失败"}</Text>
      </View>
    );
  }

  if (!output.success || !output.result) {
    return (
      <View style={[styles.root, styles.emptyCard]}>
        <Text style={styles.emptyText}>未获取到个人信息</Text>
        <Text style={styles.emptyHint}>请检查是否已登录教务或登录态是否过期</Text>
      </View>
    );
  }

  const info = output.result;
  const meta = [info.college, info.major, info.className, info.grade].filter(Boolean).join(" · ");

  const navigate = () => router.push("/mine/profile" as Href);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={navigate}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <Text style={styles.name}>
        {info.name || "同学"}
        {info.studentId ? ` · ${info.studentId}` : ""}
      </Text>
      {meta ? (
        <Text style={styles.meta} numberOfLines={2}>
          {meta}
        </Text>
      ) : null}
      <View style={styles.tagRow}>
        {info.identity ? <Tag text={info.identity} /> : null}
        {info.studentStatus ? <Tag text={info.studentStatus} /> : null}
        {info.campus ? <Tag text={info.campus} /> : null}
      </View>
    </Pressable>
  );
}

function Tag({ text }: { text: string }) {
  const styles = useStyles();
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

export const PersonalInfoCard = memo(PersonalInfoCardInner);

const useStyles = createThemedStyles((t) => ({
  root: {
    width: "100%",
    backgroundColor: t.color.brandMuted,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    gap: 8,
  },
  pressed: {
    opacity: 0.75,
  },
  name: {
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.brand,
  },
  meta: {
    fontSize: t.fontSize.sm,
    color: t.color.text,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  tag: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: t.color.textSecondary,
  },
  emptyCard: {
    backgroundColor: t.color.surfaceVariant,
    gap: 4,
  },
  emptyText: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
    textAlign: "center",
  },
  emptyHint: {
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

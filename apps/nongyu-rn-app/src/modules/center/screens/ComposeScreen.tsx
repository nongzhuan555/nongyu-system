import { useThemeTokens } from "@/theme/ThemeProvider";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "@/components/ui/toast";
import { createPost } from "@/modules/center/api/posts";
import { subtypeOptionsFor } from "@/modules/center/constants/subtypes";
import { trackClick } from "@/modules/telemetry";
import { createThemedStyles } from "@/theme/createThemedStyles";

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

/**
 * 发帖页：纯文本标题 + 正文 + 固定 subtype
 * 可选 query：postType、subtype、title（用于设置页等预填入口）
 */
export function ComposeScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const params = useLocalSearchParams<{
    postType?: string | string[];
    subtype?: string | string[];
    title?: string | string[];
  }>();
  const postTypeRaw = paramString(params.postType);
  const postType = postTypeRaw === "feedback" || postTypeRaw === "courtyard" ? postTypeRaw : null;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const options = postType ? subtypeOptionsFor(postType) : [];
  const [subtype, setSubtype] = useState(() => {
    const preferred = paramString(params.subtype);
    if (preferred && options.some((o) => o.value === preferred)) return preferred;
    return options[0]?.value ?? "";
  });
  const [title, setTitle] = useState(() => paramString(params.title));
  const [content, setContent] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      createPost({
        postType: postType!,
        subtype,
        title: title.trim(),
        content: content.trim(),
      }),
    onSuccess: async () => {
      toast.success("发布成功");
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      router.back();
    },
    onError: (err: Error) => {
      toast.error("发布失败", { description: err.message });
    },
  });

  const canSubmit =
    !!postType &&
    subtype.length > 0 &&
    title.trim().length > 0 &&
    title.trim().length <= 200 &&
    content.trim().length > 0 &&
    !submit.isPending;

  if (!postType) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>无效的发帖类型</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>返回</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={t.color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{postType === "feedback" ? "写反馈" : "发大院"}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={() => {
            trackClick("center_post_submit");
            submit.mutate();
          }}
          style={[styles.submitBtn, !canSubmit && styles.submitDisabled]}
        >
          {submit.isPending ? (
            <ActivityIndicator color={t.color.onBrand} size="small" />
          ) : (
            <Text style={styles.submitText}>发布</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + t.space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>类型</Text>
        <View style={styles.chips}>
          {options.map((opt) => {
            const active = opt.value === subtype;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setSubtype(opt.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>标题</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="一句话概括"
          placeholderTextColor={t.color.textSecondary}
          maxLength={200}
          style={styles.input}
        />

        <Text style={styles.label}>内容</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="说说你的想法（纯文本）"
          placeholderTextColor={t.color.textSecondary}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.contentInput]}
        />
      </ScrollView>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: t.space.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space.sm,
    paddingVertical: t.space.xs,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
    letterSpacing: 0.3,
  },
  submitBtn: {
    minWidth: 64,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: t.radius.full,
    backgroundColor: t.color.brand,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: t.color.onBrand,
    fontWeight: "700",
    fontSize: t.fontSize.sm,
  },
  form: {
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.md,
    gap: t.space.sm,
  },
  label: {
    marginTop: t.space.md,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: "600",
    color: t.color.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: t.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
  },
  chipActive: {
    backgroundColor: t.color.brandMuted,
    borderColor: t.color.brand,
  },
  chipText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    fontWeight: "500",
  },
  chipTextActive: {
    color: t.color.brand,
    fontWeight: "700",
  },
  input: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.color.border,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 12,
    fontSize: t.fontSize.md,
    color: t.color.text,
    lineHeight: 24,
  },
  contentInput: {
    minHeight: 200,
    borderBottomWidth: 0,
    marginTop: 4,
  },
  errorText: {
    color: t.color.danger,
  },
  link: {
    color: t.color.brand,
    fontWeight: "600",
  },
}));

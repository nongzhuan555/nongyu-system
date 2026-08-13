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
import { lightTokens } from "@/theme/tokens";

/**
 * 发帖页：纯文本标题 + 正文 + 固定 subtype
 */
export function ComposeScreen() {
  const { postType: postTypeParam } = useLocalSearchParams<{ postType?: string }>();
  const postType =
    postTypeParam === "feedback" || postTypeParam === "courtyard" ? postTypeParam : null;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const options = postType ? subtypeOptionsFor(postType) : [];
  const [subtype, setSubtype] = useState(options[0]?.value ?? "");
  const [title, setTitle] = useState("");
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
          <Ionicons name="chevron-back" size={22} color={lightTokens.color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{postType === "feedback" ? "写反馈" : "发大院"}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={() => submit.mutate()}
          style={[styles.submitBtn, !canSubmit && styles.submitDisabled]}
        >
          {submit.isPending ? (
            <ActivityIndicator color={lightTokens.color.onBrand} size="small" />
          ) : (
            <Text style={styles.submitText}>发布</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.form,
          { paddingBottom: insets.bottom + lightTokens.space.xl },
        ]}
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
          placeholderTextColor={lightTokens.color.textSecondary}
          maxLength={200}
          style={styles.input}
        />

        <Text style={styles.label}>内容</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="说说你的想法（纯文本）"
          placeholderTextColor={lightTokens.color.textSecondary}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.contentInput]}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: lightTokens.color.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: lightTokens.space.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: lightTokens.space.sm,
    paddingVertical: lightTokens.space.xs,
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
    fontSize: lightTokens.fontSize.md,
    fontWeight: "600",
    color: lightTokens.color.text,
    letterSpacing: 0.3,
  },
  submitBtn: {
    minWidth: 64,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: lightTokens.radius.full,
    backgroundColor: lightTokens.color.brand,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: lightTokens.color.onBrand,
    fontWeight: "700",
    fontSize: lightTokens.fontSize.sm,
  },
  form: {
    paddingHorizontal: lightTokens.space.lg,
    paddingTop: lightTokens.space.md,
    gap: lightTokens.space.sm,
  },
  label: {
    marginTop: lightTokens.space.md,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: "600",
    color: lightTokens.color.textSecondary,
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
    borderRadius: lightTokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTokens.color.border,
    backgroundColor: lightTokens.color.surface,
  },
  chipActive: {
    backgroundColor: lightTokens.color.brandMuted,
    borderColor: lightTokens.color.brand,
  },
  chipText: {
    fontSize: lightTokens.fontSize.sm,
    color: lightTokens.color.textSecondary,
    fontWeight: "500",
  },
  chipTextActive: {
    color: lightTokens.color.brand,
    fontWeight: "700",
  },
  input: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightTokens.color.border,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 12,
    fontSize: lightTokens.fontSize.md,
    color: lightTokens.color.text,
    lineHeight: 24,
  },
  contentInput: {
    minHeight: 200,
    borderBottomWidth: 0,
    marginTop: 4,
  },
  errorText: {
    color: lightTokens.color.danger,
  },
  link: {
    color: lightTokens.color.brand,
    fontWeight: "600",
  },
});

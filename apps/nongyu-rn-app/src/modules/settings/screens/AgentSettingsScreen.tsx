import { useThemeTokens } from "@/theme/ThemeProvider";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SettingsPageShell } from "../components/SettingsPageShell";
import {
  AGENT_PROVIDER_PRESETS,
  CUSTOM_PROVIDER_ID,
  matchPresetByBaseURL,
  type AgentProviderPreset,
} from "../agentProviderPresets";
import { useAgentContextPrefsStore, type AgentContextMode } from "../store/agentContextPrefsStore";
import { invalidateNongyuAgent } from "@/agent/agent";
import { toast } from "@/components/ui/toast";
import {
  clearAgentConfig,
  DEFAULT_AGENT_MODEL,
  loadAgentConfig,
  saveAgentConfig,
} from "@/storage/agentConfig";
import { probeAgentConnectivity } from "../probeAgentConnectivity";
import { createThemedStyles } from "@/theme/createThemedStyles";

const CONTEXT_MODE_OPTIONS: {
  id: AgentContextMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "full",
    label: "完整上下文（默认）",
    hint: "每次提问会带上本会话所有对话记录（含摘要），模型能记住前文，适合连续追问",
  },
  {
    id: "stateless",
    label: "无记忆",
    hint: "每次只发送当前问题与系统提示词，模型看不到历史，更省Token但模型不记得前文",
  },
];

/**
 * Agent 设置：上下文模式 + 服务商预设 + Base URL + 模型名 + API Key
 * 凭据保存前固定发「你好」探测模型连通性，通过后才写入 SecureStore。
 */
export function AgentSettingsScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const contextMode = useAgentContextPrefsStore((s) => s.contextMode);
  const setContextMode = useAgentContextPrefsStore((s) => s.setContextMode);
  const [presetId, setPresetId] = useState(AGENT_PROVIDER_PRESETS[0]!.id);
  const [baseURL, setBaseURL] = useState(AGENT_PROVIDER_PRESETS[0]!.baseURL ?? "");
  const [model, setModel] = useState(AGENT_PROVIDER_PRESETS[0]!.defaultModel);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isCustom = presetId === CUSTOM_PROVIDER_ID;
  const activePreset = AGENT_PROVIDER_PRESETS.find((p) => p.id === presetId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const config = await loadAgentConfig();
      if (cancelled) return;
      if (config) {
        const matched = matchPresetByBaseURL(config.baseURL);
        setPresetId(matched.id);
        setBaseURL(config.baseURL);
        setApiKey(config.apiKey);
        setModel(config.model || matched.defaultModel);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSelectPreset = useCallback((preset: AgentProviderPreset) => {
    setPresetId(preset.id);
    if (preset.baseURL != null) {
      setBaseURL(preset.baseURL);
    }
    setModel(preset.defaultModel);
  }, []);

  const onSelectContextMode = useCallback(
    (id: AgentContextMode, label: string) => {
      if (id === contextMode) return;
      try {
        setContextMode(id);
        toast.success(`上下文模式已设为${label}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "请稍后重试";
        toast.error("设置上下文模式失败", { description: msg });
      }
    },
    [contextMode, setContextMode],
  );

  const onSave = useCallback(async () => {
    const url = baseURL.trim();
    const key = apiKey.trim();
    const modelName = model.trim() || DEFAULT_AGENT_MODEL;
    if (!url || !key) {
      toast.error("请填写完整", { description: "Base URL 与 API Key 均不能为空" });
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Base URL 无效", { description: "需以 http:// 或 https:// 开头" });
      return;
    }
    setSaving(true);
    try {
      toast.info("正在检测模型连通性…");
      const probe = await probeAgentConnectivity({
        baseURL: url,
        apiKey: key,
        model: modelName,
      });
      if (!probe.ok) {
        toast.error("连通性检测失败", { description: probe.reason });
        return;
      }
      await saveAgentConfig({ baseURL: url, apiKey: key, model: modelName });
      invalidateNongyuAgent();
      toast.success("已保存", { description: "模型连通性正常" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "请稍后重试";
      toast.error("保存失败", { description: msg });
    } finally {
      setSaving(false);
    }
  }, [baseURL, apiKey, model]);

  const onClear = useCallback(async () => {
    setSaving(true);
    try {
      await clearAgentConfig();
      invalidateNongyuAgent();
      const first = AGENT_PROVIDER_PRESETS[0]!;
      setPresetId(first.id);
      setBaseURL(first.baseURL ?? "");
      setModel(first.defaultModel);
      setApiKey("");
      toast.success("已清除");
    } catch {
      toast.error("清除失败");
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <SettingsPageShell title="农屿 Agent">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + t.space.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={t.color.brand} style={styles.loader} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>上下文管理</Text>
            <View style={styles.modeCard}>
              {CONTEXT_MODE_OPTIONS.map((opt, index) => {
                const selected = contextMode === opt.id;
                return (
                  <View key={opt.id}>
                    {index > 0 ? <View style={styles.modeDivider} /> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => onSelectContextMode(opt.id, opt.label)}
                      style={({ pressed }) => [styles.modeRow, pressed && styles.modePressed]}
                    >
                      <View style={styles.modeTextCol}>
                        <Text style={styles.modeTitle}>{opt.label}</Text>
                        <Text style={styles.modeHint}>{opt.hint}</Text>
                      </View>
                      <View style={[styles.radio, selected && styles.radioOn]}>
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <Text style={styles.modeFooterHint}>更改后立即生效；清除 API Key 不会重置此项</Text>

            <View style={styles.platformHintCard}>
              <Text style={styles.platformHint}>
                若您未配置自己的大模型API
                Key，农屿会使用我们自己搭建的基于智谱的免费API调度池为您转发大模型调用，好处是您无需自己承担任何费用，缺点是服务不稳定且大概率遇到排队情况，农屿鼓励用户自行尝试配置大模型，若有此需求可自行上网搜索方法，欢迎大家拥抱AI来为我们的调度池减轻负担
              </Text>
            </View>

            <Text style={styles.sectionTitle}>服务商</Text>
            <View style={styles.card}>
              <Text style={styles.hint}>点选后自动填入 Base URL 与推荐模型；也可选「自定义」</Text>
              <View style={styles.chipRow}>
                {AGENT_PROVIDER_PRESETS.map((preset) => {
                  const selected = preset.id === presetId;
                  return (
                    <Pressable
                      key={preset.id}
                      onPress={() => onSelectPreset(preset)}
                      style={[styles.chip, selected && styles.chipSelected]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {activePreset?.hint ? <Text style={styles.hint}>{activePreset.hint}</Text> : null}
            </View>

            <Text style={styles.sectionTitle}>Base URL</Text>
            <View style={styles.card}>
              <TextInput
                style={[styles.input, !isCustom && styles.inputReadonly]}
                value={baseURL}
                onChangeText={(text) => {
                  setBaseURL(text);
                  if (!isCustom) setPresetId(CUSTOM_PROVIDER_ID);
                }}
                placeholder="https://api.deepseek.com/v1"
                placeholderTextColor={t.color.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={isCustom}
              />
              {!isCustom ? (
                <Text style={styles.hint}>预设地址已锁定；改地址请选「自定义」</Text>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>模型名</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.input}
                value={model}
                onChangeText={setModel}
                placeholder={activePreset?.defaultModel ?? DEFAULT_AGENT_MODEL}
                placeholderTextColor={t.color.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.sectionTitle}>API Key</Text>
            <View style={styles.card}>
              <Text style={styles.hint}>仅存本机 SecureStore，登出后清空</Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="sk-…"
                placeholderTextColor={t.color.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnGhost, saving && styles.btnDisabled]}
                onPress={() => void onClear()}
                disabled={saving}
              >
                <Text style={styles.btnGhostText}>清除</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary, saving && styles.btnDisabled]}
                onPress={() => void onSave()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={t.color.onBrand} />
                ) : (
                  <Text style={styles.btnPrimaryText}>保存并检测</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SettingsPageShell>
  );
}

const useStyles = createThemedStyles((t) => ({
  content: {
    paddingTop: t.space.sm,
    gap: t.space.sm,
  },
  loader: {
    marginTop: t.space.xl,
  },
  sectionTitle: {
    marginTop: t.space.sm,
    marginBottom: 4,
    fontSize: t.fontSize.sm,
    fontWeight: "700",
    color: t.color.textSecondary,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.md,
    padding: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    gap: t.space.sm,
  },
  modeCard: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    overflow: "hidden",
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: t.space.md,
    gap: 12,
  },
  modePressed: {
    opacity: 0.88,
  },
  modeDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.color.border,
    marginLeft: t.space.md,
  },
  modeTextCol: {
    flex: 1,
  },
  modeTitle: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
  },
  modeHint: {
    marginTop: 4,
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 18,
  },
  modeFooterHint: {
    marginTop: 4,
    marginHorizontal: 4,
    fontSize: 12,
    lineHeight: 18,
    color: t.color.textSecondary,
  },
  platformHintCard: {
    marginTop: t.space.md,
    marginBottom: t.space.sm,
    padding: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.color.surfaceVariant,
  },
  platformHint: {
    fontSize: t.fontSize.sm,
    lineHeight: 20,
    color: t.color.textSecondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: t.color.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioOn: {
    borderColor: t.color.brand,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: t.color.brand,
  },
  hint: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: t.radius.full,
    backgroundColor: t.color.brandMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  chipSelected: {
    backgroundColor: t.color.brand,
    borderColor: t.color.brand,
  },
  chipText: {
    fontSize: t.fontSize.sm,
    fontWeight: "600",
    color: t.color.brand,
  },
  chipTextSelected: {
    color: t.color.onBrand,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    borderRadius: t.radius.md,
    backgroundColor: t.color.brandMuted,
    color: t.color.text,
    fontSize: t.fontSize.md,
  },
  inputReadonly: {
    opacity: 0.85,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: t.space.md,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: t.radius.md,
    minHeight: 48,
  },
  btnPrimary: {
    backgroundColor: t.color.brand,
  },
  btnPrimaryText: {
    color: t.color.onBrand,
    fontWeight: "700",
  },
  btnGhost: {
    backgroundColor: t.color.brandMuted,
  },
  btnGhostText: {
    color: t.color.brand,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.55,
  },
}));

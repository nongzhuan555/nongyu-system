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

/**
 * Agent 设置：服务商预设 + Base URL + 模型名 + API Key
 * 保存前固定发「你好」探测模型连通性，通过后才写入 SecureStore。
 */
export function AgentSettingsScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
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

import { useThemeTokens } from "@/theme/ThemeProvider";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SettingsPageShell } from "../components/SettingsPageShell";
import { SizeSegment } from "../components/SizeSegment";
import {
  clearPersistedCourseBackground,
  pickAndPersistCourseBackground,
} from "@/modules/course/data/courseBackground";
import { hasLocalCourses } from "@/modules/course/data/courseLocalStore";
import {
  CourseShareError,
  disableShare,
  enableShare,
  fetchMyShareStatus,
} from "@/modules/course/data/courseShareRepository";
import { useCourseUiStore } from "@/modules/course/store/courseUiStore";
import { COURSE_SIZE_LABELS, type CourseSizeScale } from "@/modules/course/model/coursePrefs";
import { toast } from "@/components/ui/toast";
import { useSessionStore } from "@/stores/session";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 课表设置：背景图、卡片大小、字体大小、课表共享
 */
export function CourseSettingsScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const studentId = useSessionStore((s) => s.profile?.studentId);
  const backgroundUri = useCourseUiStore((s) => s.backgroundUri);
  const cardSize = useCourseUiStore((s) => s.cardSize);
  const fontSize = useCourseUiStore((s) => s.fontSize);
  const setBackgroundUri = useCourseUiStore((s) => s.setBackgroundUri);
  const setCardSize = useCourseUiStore((s) => s.setCardSize);
  const setFontSize = useCourseUiStore((s) => s.setFontSize);
  const [picking, setPicking] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareBootstrapping, setShareBootstrapping] = useState(true);

  useEffect(() => {
    if (!studentId) {
      setShareBootstrapping(false);
      return;
    }
    let cancelled = false;
    setShareBootstrapping(true);
    fetchMyShareStatus(studentId)
      .then((s) => {
        if (!cancelled) setShareEnabled(s.shareEnabled);
      })
      .catch(() => {
        if (!cancelled) setShareEnabled(false);
      })
      .finally(() => {
        if (!cancelled) setShareBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const onToggleShare = useCallback(
    (next: boolean) => {
      if (!studentId || shareLoading) return;

      if (next) {
        if (!hasLocalCourses(studentId)) {
          toast.error("无法开启共享", { description: "请先到课表页获取课表" });
          return;
        }
        Alert.alert(
          "开启课表共享",
          "开启后，其他已登录用户可通过你的学号查看你的原始课表（不含备注、待办与自定义日程）。可随时关闭并删除远端副本。",
          [
            { text: "取消", style: "cancel" },
            {
              text: "开启",
              onPress: () => {
                void (async () => {
                  setShareLoading(true);
                  try {
                    await enableShare(studentId);
                    setShareEnabled(true);
                    toast.success("已开启课表共享");
                  } catch (err) {
                    const msg =
                      err instanceof CourseShareError
                        ? err.message
                        : err instanceof Error
                          ? err.message
                          : "请稍后重试";
                    toast.error("开启失败", { description: msg });
                  } finally {
                    setShareLoading(false);
                  }
                })();
              },
            },
          ],
        );
        return;
      }

      Alert.alert("关闭课表共享", "关闭后他人将无法查看，远端课表副本将被删除。", [
        { text: "取消", style: "cancel" },
        {
          text: "关闭",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setShareLoading(true);
              try {
                await disableShare(studentId);
                setShareEnabled(false);
                toast.success("已关闭课表共享");
              } catch (err) {
                const msg = err instanceof Error ? err.message : "请稍后重试";
                toast.error("关闭失败", { description: msg });
              } finally {
                setShareLoading(false);
              }
            })();
          },
        },
      ]);
    },
    [shareLoading, studentId],
  );

  const onPick = async () => {
    setPicking(true);
    try {
      const uri = await pickAndPersistCourseBackground();
      setBackgroundUri(uri);
      toast.success("背景已更新");
    } catch (err) {
      if (err instanceof Error && err.message === "CANCELLED") return;
      const msg = err instanceof Error ? err.message : "请稍后重试";
      toast.error("设置背景失败", { description: msg });
    } finally {
      setPicking(false);
    }
  };

  const onClear = async () => {
    try {
      await clearPersistedCourseBackground();
      setBackgroundUri(null);
      toast.success("已清除背景");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "请稍后重试";
      toast.error("清除背景失败", { description: msg });
    }
  };

  const onCardSizeChange = useCallback(
    (size: CourseSizeScale) => {
      if (size === cardSize) return;
      try {
        setCardSize(size);
        toast.success(`卡片大小已设为${COURSE_SIZE_LABELS[size]}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "请稍后重试";
        toast.error("设置卡片大小失败", { description: msg });
      }
    },
    [cardSize, setCardSize],
  );

  const onFontSizeChange = useCallback(
    (size: CourseSizeScale) => {
      if (size === fontSize) return;
      try {
        setFontSize(size);
        toast.success(`字体大小已设为${COURSE_SIZE_LABELS[size]}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "请稍后重试";
        toast.error("设置字体大小失败", { description: msg });
      }
    },
    [fontSize, setFontSize],
  );

  return (
    <SettingsPageShell title="课表设置">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + t.space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>课表共享</Text>
        <View style={styles.card}>
          <View style={styles.shareRow}>
            <View style={styles.shareTextCol}>
              <Text style={styles.shareTitle}>开启课表共享</Text>
              <Text style={styles.hint}>
                开启后农屿会远程存储你的原始课表，他人可用学号只读查看你的原始课表（不含备注/课程待办/自定义日程/考勤记录），便于比较双方课程差异和冲突
              </Text>
            </View>
            {shareBootstrapping || shareLoading ? (
              <ActivityIndicator color={t.color.brand} />
            ) : (
              <Switch
                value={shareEnabled}
                onValueChange={onToggleShare}
                trackColor={{
                  false: t.color.border,
                  true: t.color.brandMuted,
                }}
                thumbColor={shareEnabled ? t.color.brand : t.color.surface}
                accessibilityLabel="允许课表共享"
              />
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>背景图</Text>
        <View style={styles.card}>
          {backgroundUri ? (
            <Image source={{ uri: backgroundUri }} style={styles.preview} contentFit="cover" />
          ) : (
            <View style={[styles.preview, styles.previewEmpty]}>
              <Text style={styles.previewHint}>未设置背景</Text>
            </View>
          )}
          <View style={styles.bgActions}>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => void onPick()}
              disabled={picking}
            >
              {picking ? (
                <ActivityIndicator color={t.color.onBrand} />
              ) : (
                <Text style={styles.btnPrimaryText}>选择图片</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnGhost, !backgroundUri && styles.btnDisabled]}
              onPress={() => void onClear()}
              disabled={!backgroundUri}
            >
              <Text style={styles.btnGhostText}>清除背景</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>卡片大小</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>调整大课区间行高（默认「中」）</Text>
          <SizeSegment value={cardSize} onChange={onCardSizeChange} />
        </View>

        <Text style={styles.sectionTitle}>字体大小</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>仅影响课程卡片内文字（默认「中」）</Text>
          <SizeSegment value={fontSize} onChange={onFontSizeChange} />
        </View>
      </ScrollView>
    </SettingsPageShell>
  );
}

const useStyles = createThemedStyles((t) => ({
  content: {
    paddingTop: t.space.sm,
    gap: t.space.sm,
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
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  shareTextCol: {
    flex: 1,
    gap: 4,
  },
  shareTitle: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
  },
  preview: {
    width: "100%",
    height: 140,
    borderRadius: t.radius.sm,
    overflow: "hidden",
  },
  previewEmpty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.surfaceVariant,
  },
  previewHint: {
    color: t.color.textSecondary,
    fontSize: t.fontSize.sm,
  },
  bgActions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: t.radius.md,
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
    opacity: 0.45,
  },
  hint: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    marginBottom: 4,
  },
}));

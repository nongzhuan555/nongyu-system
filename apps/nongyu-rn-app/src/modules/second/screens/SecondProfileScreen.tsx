import { useThemeTokens } from "@/theme/ThemeProvider";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getUserInfo, getPersonalSecondInfo } from "nongyu-tool-second";
import { Ionicons } from "@expo/vector-icons";
import { SecondAppBar } from "@/modules/second/components/SecondAppBar";
import { SecondProfileSkeleton } from "@/modules/second/components/SecondSkeletons";
import { SecondSurface } from "@/modules/second/components/SecondSurface";
import { useSecondQuery } from "@/modules/second/hooks/useSecondQuery";
import { createThemedStyles } from "@/theme/createThemedStyles";

type ProfilePayload = {
  userInfo: Record<string, unknown> | null;
  reportCard: Record<string, unknown> | null;
  hoursDetail: Record<string, unknown>[];
  importCredits: Record<string, unknown>[];
};

/**
 * 个人二课信息（对齐旧版 UserInfo：头图 + 学分卡 + 分布 + 附加分）
 */
export function SecondProfileScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const [selectedExtra, setSelectedExtra] = useState<Record<string, unknown> | null>(null);
  const { data, isPending, isError, error, isRefetching, refresh, isSecondAuthed } =
    useSecondQuery<ProfilePayload>({
      resource: "personal-full",
      requireAuth: true,
      queryFn: async () => {
        const [userRes, personalRes] = await Promise.all([getUserInfo(), getPersonalSecondInfo(1)]);
        if (!userRes.success && !personalRes.success) {
          return {
            success: false,
            result: {
              userInfo: null,
              reportCard: null,
              hoursDetail: [],
              importCredits: [],
            },
            message: userRes.message || personalRes.message || "获取个人信息失败",
          };
        }
        return {
          success: true,
          result: {
            userInfo: (userRes.success ? userRes.result : null) as Record<string, unknown> | null,
            reportCard: (personalRes.result.reportCard ?? null) as Record<string, unknown> | null,
            hoursDetail: (personalRes.result.hoursDetail ?? []) as Record<string, unknown>[],
            importCredits: (personalRes.result.importCredits ?? []) as Record<string, unknown>[],
          },
        };
      },
    });

  const userInfo = data?.userInfo;
  const report = data?.reportCard;
  const hours = data?.hoursDetail ?? [];
  const extras = data?.importCredits ?? [];

  if (!isSecondAuthed) {
    return (
      <View style={styles.root}>
        <SecondAppBar title="个人信息" />
        <View style={styles.center}>
          <Text style={styles.muted}>请先在二课首页登录</Text>
        </View>
      </View>
    );
  }

  if (isPending && !data) {
    return (
      <View style={styles.root}>
        <View style={styles.headerBlob} />
        <SecondAppBar title="个人信息" transparent />
        <SecondProfileSkeleton />
      </View>
    );
  }

  if (isError && !data) {
    return (
      <View style={styles.root}>
        <View style={styles.headerBlob} />
        <SecondAppBar title="个人信息" transparent />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={t.color.onBrand} />
          <Text style={styles.errorTitle}>
            {error instanceof Error ? error.message : "获取个人信息失败"}
          </Text>
          <Pressable onPress={refresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const displayName = String(userInfo?.realName || userInfo?.nickName || "未命名");
  const avatarUri = typeof userInfo?.profilePicture === "string" ? userInfo.profilePicture : "";

  return (
    <View style={styles.root}>
      <View style={styles.headerBlob} />
      <SecondAppBar title="个人信息" transparent />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refresh}
            tintColor={t.color.onBrand}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.avatarRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={36} color={t.color.brand} />
              </View>
            )}
            <View style={styles.userText}>
              <Text style={styles.name}>{displayName}</Text>
              <View style={styles.tags}>
                {userInfo?.enrollmentYear ? (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{String(userInfo.enrollmentYear)}级</Text>
                  </View>
                ) : null}
                {userInfo?.id ? (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{String(userInfo.id)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {report ? (
            <SecondSurface style={styles.statsCard}>
              <View style={styles.scoreRow}>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreValue}>{String(report.totalCreditScore ?? "-")}</Text>
                  <Text style={styles.scoreLabel}>累计学分</Text>
                </View>
                <View style={styles.vDivider} />
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreValue}>{String(report.totalPerScore ?? "-")}</Text>
                  <Text style={styles.scoreLabel}>综测得分</Text>
                </View>
              </View>
              <View style={styles.hDivider} />
              <View style={styles.rankRow}>
                <RankItem label="班级排名" rank={report.classTop} total={report.classPeopleNum} />
                <RankItem label="专业排名" rank={report.majorTop} total={report.majorPeopleNum} />
                <RankItem label="年级排名" rank={report.gradeTop} total={report.gradePeopleNum} />
                <RankItem label="全校排名" rank={report.schoolTop} total={report.schoolPeopleNum} />
              </View>
            </SecondSurface>
          ) : null}
        </View>

        {hours.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pie-chart-outline" size={20} color={t.color.brand} />
              <Text style={styles.sectionTitle}>学分分布</Text>
            </View>
            <SecondSurface>
              {hours.map((item, index) => {
                const credit = Number(item.totalCredit ?? 0);
                const progress = Math.min(credit / 20, 1);
                return (
                  <View key={`${String(item.categoryId)}-${index}`} style={styles.distItem}>
                    <View style={styles.distHeader}>
                      <Text style={styles.distName}>{String(item.categoryName ?? "-")}</Text>
                      <Text style={styles.distValue}>
                        {credit} <Text style={styles.distUnit}>学时</Text>
                      </Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                    {index < hours.length - 1 ? <View style={styles.itemDivider} /> : null}
                  </View>
                );
              })}
            </SecondSurface>
          </View>
        ) : null}

        {extras.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={20} color={t.color.brand} />
              <Text style={styles.sectionTitle}>附加分记录</Text>
            </View>
            <SecondSurface>
              {extras.map((item, index) => (
                <Pressable
                  key={`${String(item.id)}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel="查看附加分详情"
                  onPress={() => setSelectedExtra(item)}
                  style={({ pressed }) => [styles.extraItem, pressed && styles.extraPressed]}
                >
                  <View style={styles.extraHeader}>
                    <Text style={styles.extraTitle} numberOfLines={1}>
                      {String(item.title ?? "未命名")}
                    </Text>
                    <Text style={styles.extraScore}>+{String(item.score ?? "")}</Text>
                  </View>
                  <View style={styles.extraSub}>
                    {item.level ? (
                      <View style={styles.levelChip}>
                        <Text style={styles.levelText}>{String(item.level)}</Text>
                      </View>
                    ) : (
                      <View />
                    )}
                    <View style={styles.extraMeta}>
                      <Text style={styles.extraTime}>{String(item.importTime ?? "")}</Text>
                      <Ionicons name="chevron-forward" size={14} color={t.color.textSecondary} />
                    </View>
                  </View>
                  {index < extras.length - 1 ? <View style={styles.itemDivider} /> : null}
                </Pressable>
              ))}
            </SecondSurface>
          </View>
        ) : null}
      </ScrollView>

      <ExtraDetailModal item={selectedExtra} onClose={() => setSelectedExtra(null)} />
    </View>
  );
}

function ExtraDetailModal({
  item,
  onClose,
}: {
  item: Record<string, unknown> | null;
  onClose: () => void;
}) {
  const styles = useStyles();
  const t = useThemeTokens();
  const visible = item != null;
  const title = String(item?.title ?? "附加分详情");
  const score = item?.score != null ? `+${String(item.score)}` : "-";
  const level = item?.level != null ? String(item.level) : "";
  const time = item?.importTime != null ? String(item.importTime) : "";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalMask} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalAccent} />
          <View style={styles.modalHeader}>
            <View style={styles.modalIcon}>
              <Ionicons name="star" size={18} color={t.color.brand} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="关闭"
              onPress={onClose}
              hitSlop={8}
              style={styles.modalClose}
            >
              <Ionicons name="close" size={20} color={t.color.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.modalEyebrow}>附加分记录</Text>
          <Text style={styles.modalTitle} selectable>
            {title}
          </Text>

          <View style={styles.modalScoreRow}>
            <Text style={styles.modalScore}>{score}</Text>
            <Text style={styles.modalScoreUnit}>分</Text>
          </View>

          <View style={styles.modalMetaBlock}>
            {level ? (
              <View style={styles.modalMetaRow}>
                <Text style={styles.modalMetaLabel}>级别</Text>
                <View style={styles.levelChip}>
                  <Text style={styles.levelText}>{level}</Text>
                </View>
              </View>
            ) : null}
            {time ? (
              <View style={styles.modalMetaRow}>
                <Text style={styles.modalMetaLabel}>导入时间</Text>
                <Text style={styles.modalMetaValue}>{time}</Text>
              </View>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.modalDone, pressed && styles.extraPressed]}
          >
            <Text style={styles.modalDoneText}>知道了</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RankItem({ label, rank, total }: { label: string; rank: unknown; total: unknown }) {
  const styles = useStyles();
  return (
    <View style={styles.rankItem}>
      <Text style={styles.rankLabel}>{label}</Text>
      <View style={styles.rankValues}>
        <Text style={styles.rankNum}>{String(rank ?? "-")}</Text>
        <Text style={styles.rankTotal}>/{String(total ?? "-")}</Text>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: { flex: 1, backgroundColor: t.color.background },
  headerBlob: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: t.color.brand,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  content: { padding: 16, paddingBottom: 40, paddingTop: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { color: t.color.textSecondary },
  errorTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: t.color.onBrand,
    fontWeight: "600",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  retryText: { color: t.color.onBrand, fontWeight: "700" },
  header: { marginBottom: 24, marginTop: 10 },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: t.color.onBrand,
  },
  avatarFallback: {
    backgroundColor: t.color.brandMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  userText: { marginLeft: 16, flex: 1 },
  name: {
    fontWeight: "700",
    color: t.color.onBrand,
    fontSize: 22,
    marginBottom: 8,
  },
  tags: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: { color: t.color.onBrand, fontSize: 12 },
  statsCard: {
    marginTop: 8,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  scoreItem: { alignItems: "center", flex: 1 },
  scoreValue: {
    color: t.color.brand,
    fontWeight: "700",
    fontSize: 32,
  },
  scoreLabel: {
    color: t.color.textSecondary,
    fontSize: t.fontSize.sm,
    marginTop: 4,
  },
  vDivider: { width: 1, height: 40, backgroundColor: "rgba(10, 124, 89, 0.12)" },
  hDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(10, 124, 89, 0.10)",
    marginVertical: 16,
  },
  rankRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  rankItem: { alignItems: "center", width: "50%", marginBottom: 16 },
  rankLabel: {
    color: t.color.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  rankValues: { flexDirection: "row", alignItems: "baseline" },
  rankNum: {
    color: t.color.brand,
    fontWeight: "700",
    fontSize: t.fontSize.md,
  },
  rankTotal: { color: t.color.textSecondary, marginLeft: 2, fontSize: 12 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: t.fontSize.md,
    color: t.color.text,
  },
  distItem: { marginVertical: 6 },
  distHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  distName: { color: t.color.text, fontSize: t.fontSize.md },
  distValue: {
    fontWeight: "700",
    color: t.color.brand,
    fontSize: t.fontSize.md,
  },
  distUnit: {
    fontSize: 12,
    color: t.color.textSecondary,
    fontWeight: "400",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: t.color.brandMuted,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: t.color.brand,
    borderRadius: 3,
  },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(10, 124, 89, 0.08)",
    marginTop: 16,
  },
  extraItem: { marginVertical: 4 },
  extraPressed: { opacity: 0.85 },
  extraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  extraTitle: {
    flex: 1,
    marginRight: 12,
    fontSize: 15,
    fontWeight: "500",
    color: t.color.text,
  },
  extraScore: {
    color: t.color.brand,
    fontWeight: "700",
    fontSize: t.fontSize.md,
  },
  extraSub: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  extraMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  levelChip: {
    backgroundColor: t.color.brandMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelText: { fontSize: 11, color: t.color.brand, fontWeight: "600" },
  extraTime: { color: t.color.textSecondary, fontSize: 12 },
  modalMask: {
    flex: 1,
    backgroundColor: "rgba(4, 33, 22, 0.42)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: t.color.surface,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.12)",
    overflow: "hidden",
    shadowColor: t.color.brand,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
  modalAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: t.color.brand,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: t.color.brandMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  modalClose: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  modalEyebrow: {
    fontSize: 12,
    fontWeight: "600",
    color: t.color.brand,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: t.color.text,
    lineHeight: 26,
    marginBottom: 16,
  },
  modalScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 18,
  },
  modalScore: {
    fontSize: 36,
    fontWeight: "800",
    color: t.color.brand,
  },
  modalScoreUnit: {
    fontSize: 14,
    fontWeight: "600",
    color: t.color.textSecondary,
  },
  modalMetaBlock: {
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: t.radius.md,
    backgroundColor: t.color.background,
    marginBottom: 18,
  },
  modalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  modalMetaLabel: {
    fontSize: 13,
    color: t.color.textSecondary,
  },
  modalMetaValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    color: t.color.text,
  },
  modalDone: {
    height: 44,
    borderRadius: t.radius.md,
    backgroundColor: t.color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDoneText: {
    color: t.color.onBrand,
    fontWeight: "700",
    fontSize: 15,
  },
}));

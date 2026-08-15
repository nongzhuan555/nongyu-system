import { useThemeTokens } from "@/theme/ThemeProvider";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { listActivities, getSchoolActTypes, getSchoolGroups } from "nongyu-tool-second";
import { ScrollToTopFab, useScrollToTopVisibility } from "@/components/ui/ScrollToTopFab";
import { SecondAppBar } from "@/modules/second/components/SecondAppBar";
import { SecondActivityListSkeleton } from "@/modules/second/components/SecondSkeletons";
import { SecondSurface } from "@/modules/second/components/SecondSurface";
import { useDeferredLocalSearch } from "@/modules/jiaowu/hooks/useDeferredLocalSearch";
import { useSecondAuth } from "@/modules/second/hooks/useSecondAuth";
import { createThemedStyles } from "@/theme/createThemedStyles";

type ActItem = {
  id?: number;
  title?: string;
  logo?: string;
  typeName?: string;
  addr?: string;
  startTime?: string;
  statusName?: string;
};

type Tribe = { id: string; name: string };
type Category = { id: string; name: string; types?: Category[] };

type SortType = "1" | "2" | "4";

/**
 * 二课活动列表：主题色 + 简约卡；搜索带防抖与模拟加载延迟
 */
export function SecondActivitiesScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const { isSecondAuthed } = useSecondAuth();
  const { draft, setDraft, query, searching } = useDeferredLocalSearch();
  const listRef = useRef<FlatList<ActItem>>(null);
  const { visible: showScrollTop, onScroll: onScrollTopVisibility } = useScrollToTopVisibility();

  const [activities, setActivities] = useState<ActItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortType, setSortType] = useState<SortType>("2");
  const [selectedGid, setSelectedGid] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showTribeModal, setShowTribeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    if (!isSecondAuthed) return;
    void (async () => {
      const [tribeRes, catRes] = await Promise.all([getSchoolGroups(), getSchoolActTypes()]);
      if (tribeRes.success && Array.isArray(tribeRes.result)) {
        setTribes(
          (tribeRes.result as { id?: string; name?: string }[])
            .filter((t) => t.id && t.name)
            .map((t) => ({ id: String(t.id), name: String(t.name) })),
        );
      }
      if (catRes.success && Array.isArray(catRes.result)) {
        setCategories(normalizeCategories(catRes.result));
      }
    })();
  }, [isSecondAuthed]);

  const fetchActivities = useCallback(
    async (pageNum: number, isRefresh: boolean) => {
      if (!isSecondAuthed) return;
      setLoading(true);
      try {
        const res = await listActivities({
          page: pageNum,
          actName: query.trim() || undefined,
          sortType: Number(sortType) as 1 | 2 | 4,
          gid: selectedGid || undefined,
          typeId: selectedTypeId || undefined,
        });
        const list = (res.success && Array.isArray(res.result) ? res.result : []) as ActItem[];
        if (isRefresh) {
          setActivities(list);
        } else {
          setActivities((prev) => [...prev, ...list]);
        }
        setHasMore(list.length >= 10);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isSecondAuthed, query, sortType, selectedGid, selectedTypeId],
  );

  useEffect(() => {
    setPage(1);
    void fetchActivities(1, true);
  }, [fetchActivities]);

  const selectedTypeLabel = useMemo(() => {
    if (!selectedTypeId) return "所有分类";
    const found = findCategoryName(categories, selectedTypeId);
    return found || "已选分类";
  }, [categories, selectedTypeId]);

  const selectedTribeLabel = useMemo(() => {
    if (!selectedGid) return "所有部落";
    return tribes.find((t) => t.id === selectedGid)?.name || "部落";
  }, [selectedGid, tribes]);

  const refreshList = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    void fetchActivities(1, true);
  }, [fetchActivities]);

  const onPressScrollTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    refreshList();
  }, [refreshList]);

  if (!isSecondAuthed) {
    return (
      <View style={styles.root}>
        <SecondAppBar title="二课活动" />
        <View style={styles.center}>
          <Text style={styles.muted}>请先在二课首页登录</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SecondAppBar title="二课活动" />

      <View style={styles.filterBox}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={t.color.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="输入关键词搜索二课活动"
            placeholderTextColor={t.color.textSecondary}
            value={draft}
            onChangeText={setDraft}
            returnKeyType="search"
            maxLength={64}
          />
          {searching ? <ActivityIndicator size="small" color={t.color.brand} /> : null}
          {draft.length > 0 && !searching ? (
            <Pressable onPress={() => setDraft("")} hitSlop={8} accessibilityLabel="清空搜索">
              <Ionicons name="close-circle" size={16} color={t.color.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.segmentRow}>
          {(
            [
              { value: "2", label: "最新" },
              { value: "1", label: "即将开始" },
              { value: "4", label: "可参与" },
            ] as const
          ).map((opt) => {
            const active = sortType === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setSortType(opt.value)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.filterButtons}>
          <Pressable style={styles.filterBtn} onPress={() => setShowTribeModal(true)}>
            <Text style={styles.filterBtnText} numberOfLines={1}>
              {selectedTribeLabel}
            </Text>
          </Pressable>
          <Pressable style={styles.filterBtn} onPress={() => setShowCategoryModal(true)}>
            <Text style={styles.filterBtnText} numberOfLines={1}>
              {selectedTypeLabel}
            </Text>
          </Pressable>
          {selectedGid || selectedTypeId ? (
            <Pressable
              onPress={() => {
                setSelectedGid("");
                setSelectedTypeId("");
              }}
            >
              <Text style={styles.resetText}>重置</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {searching ? (
        <View style={styles.searchingBar}>
          <ActivityIndicator size="small" color={t.color.brand} />
          <Text style={styles.searchingText}>搜索中…</Text>
        </View>
      ) : null}

      <View style={styles.listHost}>
        <FlatList
          ref={listRef}
          data={activities}
          keyExtractor={(item, index) => String(item.id ?? index)}
          contentContainerStyle={styles.listContent}
          onScroll={onScrollTopVisibility}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshList}
              tintColor={t.color.brand}
              colors={[t.color.brand]}
            />
          }
          onEndReached={() => {
            if (loading || searching || !hasMore) return;
            const next = page + 1;
            setPage(next);
            void fetchActivities(next, false);
          }}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loading && !refreshing && activities.length > 0 ? (
              <View style={styles.footerLoad}>
                <ActivityIndicator color={t.color.brand} />
                <Text style={styles.footerText}>加载更多…</Text>
              </View>
            ) : !hasMore && activities.length > 0 ? (
              <Text style={styles.footerText}>没有更多活动了</Text>
            ) : (
              <View style={{ height: 20 }} />
            )
          }
          ListEmptyComponent={
            !loading && !searching ? (
              <Text style={styles.empty}>暂无活动</Text>
            ) : (
              <SecondActivityListSkeleton rows={5} />
            )
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.cardWrap, pressed && styles.pressed]}
              onPress={() => {
                if (item.id == null) return;
                router.push(`/home/second/activities/${item.id}` as Href);
              }}
            >
              <SecondSurface style={styles.card} padded={false}>
                <View style={styles.cardInner}>
                  {item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.logo} />
                  ) : (
                    <View style={[styles.logo, styles.logoFallback]}>
                      <Ionicons name="image-outline" size={24} color={t.color.textSecondary} />
                    </View>
                  )}
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title || "未命名活动"}
                    </Text>
                    <View style={styles.chipRow}>
                      {item.typeName ? (
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>{item.typeName}</Text>
                        </View>
                      ) : null}
                      {item.statusName ? (
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>{item.statusName}</Text>
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
          )}
        />
        <ScrollToTopFab visible={showScrollTop} onPress={onPressScrollTop} placement="stack" />
      </View>

      <FilterModal
        visible={showTribeModal}
        title="选择部落"
        onClose={() => setShowTribeModal(false)}
      >
        <ModalRow
          label="所有部落"
          selected={!selectedGid}
          onPress={() => {
            setSelectedGid("");
            setShowTribeModal(false);
          }}
        />
        {tribes.map((tribe) => (
          <ModalRow
            key={tribe.id}
            label={tribe.name}
            selected={selectedGid === tribe.id}
            onPress={() => {
              setSelectedGid(tribe.id);
              setShowTribeModal(false);
            }}
          />
        ))}
      </FilterModal>

      <FilterModal
        visible={showCategoryModal}
        title="选择分类"
        onClose={() => setShowCategoryModal(false)}
      >
        <ModalRow
          label="所有分类"
          selected={!selectedTypeId}
          onPress={() => {
            setSelectedTypeId("");
            setShowCategoryModal(false);
          }}
        />
        <CategoryTree
          nodes={categories}
          selectedId={selectedTypeId}
          onSelect={(id) => {
            setSelectedTypeId(id);
            setShowCategoryModal(false);
          }}
        />
      </FilterModal>
    </View>
  );
}

function FilterModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.modalScroll}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ModalRow({
  label,
  selected,
  onPress,
  indent = 0,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  indent?: number;
}) {
  const styles = useStyles();
  const t = useThemeTokens();
  return (
    <Pressable onPress={onPress} style={[styles.modalRow, { paddingLeft: 16 + indent * 16 }]}>
      <Text style={styles.modalRowText} numberOfLines={1}>
        {label}
      </Text>
      {selected ? <Ionicons name="checkmark" size={18} color={t.color.brand} /> : null}
    </Pressable>
  );
}

function CategoryTree({
  nodes,
  selectedId,
  onSelect,
  level = 0,
}: {
  nodes: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  level?: number;
}) {
  return (
    <>
      {nodes.map((node) => (
        <View key={node.id}>
          <ModalRow
            label={node.name}
            selected={selectedId === node.id}
            indent={level}
            onPress={() => onSelect(node.id)}
          />
          {node.types?.length ? (
            <CategoryTree
              nodes={node.types}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ) : null}
        </View>
      ))}
    </>
  );
}

function normalizeCategories(raw: unknown[]): Category[] {
  const walk = (nodes: unknown[]): Category[] =>
    nodes
      .map((node) => {
        const n = node as { id?: string; name?: string; types?: unknown[] };
        if (!n.id || !n.name) return null;
        return {
          id: String(n.id),
          name: String(n.name),
          types: Array.isArray(n.types) ? walk(n.types) : undefined,
        };
      })
      .filter(Boolean) as Category[];
  return walk(raw);
}

function findCategoryName(nodes: Category[], id: string): string | undefined {
  for (const node of nodes) {
    if (node.id === id) return node.name;
    if (node.types) {
      const hit = findCategoryName(node.types, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

const useStyles = createThemedStyles((t) => ({
  root: { flex: 1, backgroundColor: t.color.background },
  listHost: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerPad: { paddingTop: 50, alignItems: "center", gap: 10 },
  muted: { color: t.color.textSecondary },
  filterBox: {
    padding: 12,
    backgroundColor: t.color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(10, 124, 89, 0.08)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.14)",
    borderRadius: t.radius.md,
    height: 40,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: t.color.background,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: t.color.text,
    padding: 0,
  },
  searchingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: t.color.brandMuted,
  },
  searchingText: {
    fontSize: t.fontSize.sm,
    color: t.color.brand,
    fontWeight: "600",
  },
  segmentRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: t.radius.sm,
    backgroundColor: t.color.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.10)",
  },
  segmentActive: {
    backgroundColor: t.color.brandMuted,
    borderColor: "rgba(10, 124, 89, 0.22)",
  },
  segmentText: {
    fontSize: 12,
    color: t.color.textSecondary,
    fontWeight: "600",
  },
  segmentTextActive: { color: t.color.brand },
  filterButtons: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterBtn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.28)",
    borderRadius: t.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    backgroundColor: t.color.surface,
  },
  filterBtnText: { color: t.color.brand, fontSize: 13, fontWeight: "600" },
  resetText: { color: t.color.danger, fontSize: 13, fontWeight: "600" },
  listContent: { padding: 12 },
  cardWrap: { marginBottom: 12 },
  card: {},
  cardInner: {
    flexDirection: "row",
    padding: 12,
  },
  pressed: { opacity: 0.92 },
  logo: {
    width: 96,
    height: 96,
    borderRadius: t.radius.md,
    backgroundColor: t.color.brandMuted,
  },
  logoFallback: { alignItems: "center", justifyContent: "center" },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  cardTitle: {
    fontWeight: "600",
    fontSize: 15,
    lineHeight: 21,
    color: t.color.text,
    marginBottom: 4,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4, gap: 4 },
  chip: {
    backgroundColor: t.color.brandMuted,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: { fontSize: 10, color: t.color.brand, fontWeight: "600" },
  info: { fontSize: 12, color: t.color.textSecondary },
  footerLoad: { paddingVertical: 20, alignItems: "center", gap: 8 },
  footerText: {
    textAlign: "center",
    paddingVertical: 16,
    color: t.color.textSecondary,
    fontSize: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    color: t.color.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(4, 33, 22, 0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    padding: 20,
    maxHeight: "80%",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.10)",
  },
  modalTitle: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: t.color.text,
    marginBottom: 10,
  },
  modalScroll: { maxHeight: 400 },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingRight: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(10, 124, 89, 0.08)",
  },
  modalRowText: { flex: 1, color: t.color.text, fontSize: 15 },
}));

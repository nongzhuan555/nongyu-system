import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { confirm } from "@/components/ui/confirm";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { useThemeTokens } from "@/theme/ThemeProvider";
import type { AgentChatSession } from "./types";
import { formatSessionTime, groupSessionsByUpdatedAt } from "./groupSessions";

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.82, 320);
/** 模拟远程搜索延迟（ms） */
const SEARCH_FAKE_DELAY_MS = 450;
/** 打开/关闭/吸附动画时长 */
const DRAWER_ANIM_MS = 240;
/** 松手关闭：位移超过抽屉宽度的比例 */
const CLOSE_DISTANCE_RATIO = 0.35;
/** 松手关闭：向左甩动速度阈值（px/s） */
const CLOSE_VELOCITY_X = -800;

type SessionDrawerProps = {
  visible: boolean;
  sessions: AgentChatSession[];
  activeSessionId: string | null;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onClearAll: () => void;
};

/**
 * Agent 会话左侧抽屉：新对话、标题搜索（假延迟）、列表、行内删除、清空全部；
 * 打开后支持水平拖拽跟手，松手按阈值吸附开/关。
 */
export function SessionDrawer({
  visible,
  sessions,
  activeSessionId,
  onClose,
  onNewChat,
  onSelect,
  onDelete,
  onClearAll,
}: SessionDrawerProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();

  const translateX = useSharedValue(-DRAWER_WIDTH);
  const dragStartX = useSharedValue(0);
  /** 手势关闭动画进行中，避免 visible→false 时重复播关闭动画 */
  const gestureClosing = useSharedValue(false);

  const [rendered, setRendered] = useState(visible);
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [resultSessions, setResultSessions] = useState(sessions);
  const searchGenRef = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const unmountAfterClose = useCallback(() => {
    setRendered(false);
  }, []);

  const notifyClosed = useCallback(() => {
    onCloseRef.current();
  }, []);

  // visible 驱动打开 / 非手势关闭；手势关闭后仅卸挂载
  useEffect(() => {
    if (visible) {
      gestureClosing.value = false;
      setRendered(true);
      translateX.value = withTiming(0, { duration: DRAWER_ANIM_MS });
      return;
    }

    if (gestureClosing.value) {
      gestureClosing.value = false;
      setRendered(false);
      return;
    }

    if (!rendered) return;

    translateX.value = withTiming(-DRAWER_WIDTH, { duration: DRAWER_ANIM_MS }, (finished) => {
      if (finished) runOnJS(unmountAfterClose)();
    });
  }, [visible, rendered, translateX, gestureClosing, unmountAfterClose]);

  // 关闭抽屉时清空搜索
  useEffect(() => {
    if (!visible) {
      setSearchInput("");
      setSearching(false);
      setResultSessions(sessions);
      searchGenRef.current += 1;
    }
  }, [visible, sessions]);

  // 空关键词：立即展示全量；有关键词：假延迟后再过滤
  useEffect(() => {
    if (!visible) return;

    const keyword = searchInput.trim();
    if (!keyword) {
      searchGenRef.current += 1;
      setSearching(false);
      setResultSessions(sessions);
      return;
    }

    const gen = ++searchGenRef.current;
    setSearching(true);
    const timer = setTimeout(() => {
      if (gen !== searchGenRef.current) return;
      const lower = keyword.toLowerCase();
      setResultSessions(sessions.filter((s) => s.title.toLowerCase().includes(lower)));
      setSearching(false);
    }, SEARCH_FAKE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [searchInput, sessions, visible]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-16, 16])
        .onBegin(() => {
          dragStartX.value = translateX.value;
        })
        .onUpdate((e) => {
          const next = Math.min(0, Math.max(-DRAWER_WIDTH, dragStartX.value + e.translationX));
          translateX.value = next;
        })
        .onEnd((e) => {
          const shouldClose =
            translateX.value <= -DRAWER_WIDTH * CLOSE_DISTANCE_RATIO ||
            e.velocityX <= CLOSE_VELOCITY_X;
          if (shouldClose) {
            gestureClosing.value = true;
            translateX.value = withTiming(
              -DRAWER_WIDTH,
              { duration: DRAWER_ANIM_MS },
              (finished) => {
                if (finished) runOnJS(notifyClosed)();
              },
            );
          } else {
            translateX.value = withTiming(0, { duration: DRAWER_ANIM_MS });
          }
        }),
    [dragStartX, gestureClosing, notifyClosed, translateX],
  );

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const maskStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-DRAWER_WIDTH, 0], [0, 1]),
  }));

  const groups = groupSessionsByUpdatedAt(resultSessions);
  const hasKeyword = searchInput.trim().length > 0;

  const handleClearAll = async () => {
    if (sessions.length === 0) return;
    const ok = await confirm({
      title: "清空全部会话",
      message: "将删除本机全部农屿 AI 会话，且不可恢复。",
      confirmText: "清空",
      cancelText: "取消",
      destructive: true,
    });
    if (ok) onClearAll();
  };

  if (!rendered && !visible) return null;

  return (
    <View style={styles.modalRoot} pointerEvents="box-none">
      <Animated.View style={[styles.mask, maskStyle]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭会话列表"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.panel,
            panelStyle,
            {
              width: DRAWER_WIDTH,
              paddingTop: insets.top + t.space.sm,
              paddingBottom: insets.bottom + t.space.md,
            },
          ]}
        >
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>会话</Text>
            {sessions.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="清空全部会话"
                hitSlop={8}
                onPress={() => void handleClearAll()}
              >
                <Text style={styles.clearAllText}>清空</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="新对话"
            style={({ pressed }) => [styles.newChatBtn, pressed && styles.pressed]}
            onPress={onNewChat}
          >
            <Ionicons name="add" size={20} color={t.color.text} />
            <Text style={styles.newChatText}>新对话</Text>
          </Pressable>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={t.color.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="搜索会话标题"
              placeholderTextColor={t.color.textSecondary}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchInput.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="清除搜索"
                hitSlop={8}
                onPress={() => setSearchInput("")}
              >
                <Ionicons name="close-circle" size={16} color={t.color.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          {searching ? (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="small" color={t.color.brand} />
              <Text style={styles.searchLoadingText}>搜索中…</Text>
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>还没有会话</Text>
              <Text style={styles.emptyHint}>发一条消息后会自动保存在这里</Text>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>未找到会话</Text>
              <Text style={styles.emptyHint}>
                {hasKeyword ? `没有标题包含「${searchInput.trim()}」的会话` : "换个关键词试试"}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {groups.map((group) => (
                <View key={group.key} style={styles.group}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  {group.sessions.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      active={session.id === activeSessionId}
                      onSelect={() => onSelect(session.id)}
                      onDelete={() => onDelete(session.id)}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function SessionRow({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: AgentChatSession;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const styles = useStyles();
  const t = useThemeTokens();

  const handleDelete = async () => {
    const ok = await confirm({
      title: "删除会话",
      message: `确定删除「${session.title}」？删除后不可恢复。`,
      confirmText: "删除",
      cancelText: "取消",
      destructive: true,
    });
    if (ok) onDelete();
  };

  return (
    <View style={[styles.row, active && styles.rowActive]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
        onPress={onSelect}
      >
        <Text style={styles.rowTitle} numberOfLines={1}>
          {session.title}
        </Text>
        <Text style={styles.rowTime}>{formatSessionTime(session.updatedAt)}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`删除会话 ${session.title}`}
        hitSlop={8}
        style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
        onPress={() => void handleDelete()}
      >
        <Ionicons name="trash-outline" size={16} color={t.color.textSecondary} />
      </Pressable>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  modalRoot: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
    elevation: 40,
  },
  mask: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  panel: {
    height: "100%",
    backgroundColor: t.color.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: t.color.border,
    paddingHorizontal: t.space.md,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: t.space.md,
    paddingHorizontal: t.space.xs,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: t.color.text,
    letterSpacing: 0.2,
  },
  clearAllText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    fontWeight: "500",
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
    paddingVertical: 12,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    backgroundColor: t.color.background,
    marginBottom: t.space.sm,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: "500",
    color: t.color.text,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: PlatformSelectPad,
    borderRadius: t.radius.lg,
    backgroundColor: t.color.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    marginBottom: t.space.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: t.color.text,
    paddingVertical: 0,
    minHeight: 20,
  },
  searchLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  searchLoadingText: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
  },
  list: {
    flex: 1,
  },
  group: {
    marginBottom: t.space.lg,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: t.color.textSecondary,
    marginBottom: t.space.sm,
    paddingHorizontal: t.space.sm,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: t.radius.md,
    paddingLeft: t.space.md,
    paddingRight: 4,
    marginBottom: 2,
    backgroundColor: "transparent",
  },
  rowActive: {
    backgroundColor: t.color.surfaceVariant,
  },
  rowMain: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: t.space.sm,
    gap: 3,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: t.color.text,
  },
  rowTime: {
    fontSize: 12,
    color: t.color.textSecondary,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: t.space.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: t.color.text,
    marginBottom: t.space.sm,
  },
  emptyHint: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.88,
  },
}));

/** 搜索框垂直内边距（避开在 StyleSheet factory 里依赖 Platform） */
const PlatformSelectPad = 10;

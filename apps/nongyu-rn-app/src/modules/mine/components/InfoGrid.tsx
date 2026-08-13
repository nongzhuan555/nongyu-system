import { useCallback, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutRectangle,
} from "react-native";
import type { SessionProfile } from "@/stores/session";
import { lightTokens } from "@/theme/tokens";

type InfoField = {
  key: string;
  label: string;
  value: string;
};

type InfoGridProps = {
  profile: SessionProfile;
};

type BubbleState = {
  label: string;
  value: string;
  /** 锚点在窗口中的矩形 */
  anchor: LayoutRectangle;
};

const ARROW = 7;
const BUBBLE_MAX_W = 280;
const BUBBLE_GAP = 10;

/**
 * 基本信息：整块「档案表」纯文字格；过长省略，长按冒气泡看全文
 */
export function InfoGrid({ profile }: InfoGridProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const cellRefs = useRef<Record<string, View | null>>({});
  const [bubble, setBubble] = useState<BubbleState | null>(null);

  const fields: InfoField[] = [
    { key: "college", label: "学院", value: profile.college || "未知" },
    { key: "major", label: "专业", value: profile.major || "未知" },
    { key: "className", label: "班级", value: profile.className || "未知" },
    { key: "grade", label: "年级", value: profile.grade || "未知" },
    { key: "campus", label: "校区", value: profile.campus || "未知" },
    { key: "hometown", label: "生源地", value: profile.hometown || "未知" },
  ];

  const dismiss = useCallback(() => setBubble(null), []);

  const openBubble = useCallback((field: InfoField) => {
    const node = cellRefs.current[field.key];
    if (!node) return;
    node.measureInWindow((x, y, width, height) => {
      setBubble({
        label: field.label,
        value: field.value,
        anchor: { x, y, width, height },
      });
    });
  }, []);

  const bubbleLayout = (() => {
    if (!bubble) return null;
    const { anchor } = bubble;
    const preferAbove = anchor.y > windowHeight * 0.38;
    const left = Math.min(
      Math.max(12, anchor.x + anchor.width / 2 - BUBBLE_MAX_W / 2),
      windowWidth - BUBBLE_MAX_W - 12,
    );
    const arrowLeft = Math.min(
      Math.max(16, anchor.x + anchor.width / 2 - left - ARROW),
      BUBBLE_MAX_W - 16 - ARROW * 2,
    );
    return { preferAbove, left, arrowLeft, anchor };
  })();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>基本信息</Text>

      <View style={styles.sheet}>
        {fields.map((field, index) => {
          const isLeft = index % 2 === 0;
          const isTopRow = index < 2;
          return (
            <View
              key={field.key}
              ref={(node) => {
                cellRefs.current[field.key] = node;
              }}
              collapsable={false}
              style={[
                styles.cell,
                isLeft ? styles.cellLeft : styles.cellRight,
                !isTopRow && styles.cellBorderTop,
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${field.label}：${field.value}`}
                accessibilityHint="长按查看完整内容"
                delayLongPress={280}
                onLongPress={() => openBubble(field)}
                style={({ pressed }) => [styles.cellHit, pressed && styles.cellPressed]}
              >
                <Text style={styles.label}>{field.label}</Text>
                <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
                  {field.value}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Modal visible={!!bubble} transparent animationType="fade" onRequestClose={dismiss}>
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭"
            style={[StyleSheet.absoluteFill, styles.scrim]}
            onPress={dismiss}
          />
          {bubble && bubbleLayout ? (
            <View
              pointerEvents="none"
              style={[
                styles.bubbleWrap,
                {
                  left: bubbleLayout.left,
                  width: BUBBLE_MAX_W,
                  ...(bubbleLayout.preferAbove
                    ? { bottom: windowHeight - bubbleLayout.anchor.y + BUBBLE_GAP }
                    : { top: bubbleLayout.anchor.y + bubbleLayout.anchor.height + BUBBLE_GAP }),
                },
              ]}
            >
              {!bubbleLayout.preferAbove ? (
                <View style={[styles.arrowUp, { marginLeft: bubbleLayout.arrowLeft }]} />
              ) : null}
              <View style={styles.bubble}>
                <Text style={styles.bubbleLabel}>{bubble.label}</Text>
                <Text style={styles.bubbleValue}>{bubble.value}</Text>
              </View>
              {bubbleLayout.preferAbove ? (
                <View style={[styles.arrowDown, { marginLeft: bubbleLayout.arrowLeft }]} />
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: lightTokens.space.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: lightTokens.color.textSecondary,
    marginBottom: 10,
    marginLeft: 2,
    letterSpacing: 0.6,
  },
  /** 整块档案表：一表六格，弱分割，无逐卡绿条 */
  sheet: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.1)",
    overflow: "hidden",
  },
  cell: {
    width: "50%",
  },
  cellHit: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 6,
  },
  cellLeft: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(10, 124, 89, 0.08)",
  },
  cellRight: {},
  cellBorderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(10, 124, 89, 0.08)",
  },
  cellPressed: {
    backgroundColor: "rgba(212, 233, 223, 0.55)",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: lightTokens.color.textSecondary,
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: lightTokens.color.text,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  modalRoot: {
    flex: 1,
  },
  /** 气泡出现时的轻蒙层 */
  scrim: {
    backgroundColor: "rgba(27, 43, 27, 0.38)",
  },
  bubbleWrap: {
    position: "absolute",
    zIndex: 10,
  },
  bubble: {
    backgroundColor: lightTokens.color.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.14)",
    shadowColor: "#0A7C59",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 6,
    gap: 6,
  },
  bubbleLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: lightTokens.color.brand,
    letterSpacing: 0.8,
  },
  bubbleValue: {
    fontSize: 15,
    fontWeight: "600",
    color: lightTokens.color.text,
    lineHeight: 22,
  },
  arrowUp: {
    width: 0,
    height: 0,
    marginBottom: -1,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderBottomWidth: ARROW + 1,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: lightTokens.color.surface,
  },
  arrowDown: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderTopWidth: ARROW + 1,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: lightTokens.color.surface,
  },
});

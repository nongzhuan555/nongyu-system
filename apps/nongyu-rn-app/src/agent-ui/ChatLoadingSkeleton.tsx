import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SkeletonBox } from "@/components/skeleton/SkeletonBox";
import { createThemedStyles } from "@/theme/createThemedStyles";

const BUBBLE_ROWS: ReadonlyArray<{
  side: "assistant" | "user";
  width: `${number}%`;
  height: number;
}> = [
  { side: "assistant", width: "78%", height: 56 },
  { side: "user", width: "52%", height: 36 },
  { side: "assistant", width: "68%", height: 44 },
  { side: "user", width: "42%", height: 36 },
  { side: "assistant", width: "58%", height: 40 },
];

/**
 * Agent 聊天页 agent 未就绪时的整页骨架（气泡 + 底部输入栏）
 */
export function ChatLoadingSkeleton() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const composerBottomPad = Math.max(insets.bottom, 10);

  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel="正在加载对话">
      <View style={styles.list}>
        {BUBBLE_ROWS.map((row, index) => (
          <View
            key={index}
            style={[styles.row, row.side === "user" ? styles.rowUser : styles.rowAssistant]}
          >
            <SkeletonBox
              width={row.width}
              height={row.height}
              borderRadius={row.side === "user" ? 18 : 14}
            />
          </View>
        ))}
      </View>

      <View style={[styles.composerWrap, { paddingBottom: composerBottomPad }]}>
        <View style={styles.composer}>
          <SkeletonBox height={18} style={styles.composerLine} borderRadius={6} />
          <SkeletonBox width={34} height={34} borderRadius={17} />
        </View>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
  },
  list: {
    flex: 1,
    paddingHorizontal: t.space.md,
    paddingTop: t.space.md,
    gap: t.space.md,
  },
  row: {
    width: "100%",
  },
  rowAssistant: {
    alignItems: "flex-start",
  },
  rowUser: {
    alignItems: "flex-end",
  },
  composerWrap: {
    paddingHorizontal: t.space.md,
    paddingTop: t.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.color.border,
    backgroundColor: t.color.background,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  composerLine: {
    flex: 1,
  },
}));

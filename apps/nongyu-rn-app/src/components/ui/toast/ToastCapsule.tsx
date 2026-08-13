import { BlurView, type BlurViewProps } from "expo-blur";
import { type ComponentType } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { AppToastType } from "./types";

/** RN / React 19 下 BlurView class 与 JSX 类型偶发不兼容 */
const NativeBlur = BlurView as unknown as ComponentType<BlurViewProps>;

type ToastCapsuleProps = {
  type: AppToastType;
  title?: string;
  description?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * 状态微点色（软墨底上的低饱和信号）
 * 对标 Linear / Sonner：类型用点，不用整条色轨或图标
 */
const DOT_COLOR: Record<AppToastType, string> = {
  success: "#5ECF9A",
  error: "#F07178",
  info: "rgba(244, 247, 245, 0.45)",
};

const MAX_WIDTH = Math.min(Dimensions.get("window").width - 56, 320);

/**
 * 软墨芯片 Toast
 * - 内容贴合宽度，短句不拉成通栏
 * - 深色半透明芯片浮于浅色页面之上
 * - 仅 5px 微点区分类型
 */
export function ToastCapsule({ type, title, description, onPress, style }: ToastCapsuleProps) {
  if (!title) return null;

  const hasDescription = Boolean(description);
  const body = (
    <>
      <View
        style={[styles.dot, hasDescription && styles.dotTall, { backgroundColor: DOT_COLOR[type] }]}
      />
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {hasDescription ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
    </>
  );

  const chipStyle = [styles.chip, hasDescription && styles.chipTall];

  return (
    <Pressable accessibilityRole="alert" onPress={onPress} style={[styles.wrap, style]}>
      {Platform.OS === "ios" ? (
        <NativeBlur intensity={42} tint="systemChromeMaterialDark" style={chipStyle}>
          <View style={styles.inkWash} pointerEvents="none" />
          {body}
        </NativeBlur>
      ) : (
        <View style={[...chipStyle, styles.chipAndroid]}>{body}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    maxWidth: MAX_WIDTH,
    marginHorizontal: 28,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.10)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#0B1210",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  /** 双行时略收圆角，避免满圆胶囊显臃肿 */
  chipTall: {
    borderRadius: 18,
    paddingVertical: 11,
    alignItems: "flex-start",
  },
  chipAndroid: {
    backgroundColor: "rgba(22, 30, 27, 0.94)",
  },
  inkWash: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(18, 24, 22, 0.42)",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    flexShrink: 0,
  },
  dotTall: {
    marginTop: 6,
  },
  copy: {
    flexShrink: 1,
    gap: 3,
  },
  title: {
    fontSize: 13.5,
    fontWeight: "500",
    color: "#F4F7F5",
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    fontWeight: "400",
    color: "rgba(244, 247, 245, 0.58)",
    letterSpacing: 0.15,
    lineHeight: 16,
  },
});

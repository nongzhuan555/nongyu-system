import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import {
  TabLiquidIndicator,
  hexToRgba,
  type TabIndicatorFrame,
} from "@/components/navigation/TabLiquidIndicator";
import { lightTokens } from "@/theme/tokens";

export type SegmentTabItem<T extends string> = {
  key: T;
  label: string;
};

type SegmentLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SegmentGlassTabsProps<T extends string> = {
  items: readonly SegmentTabItem<T>[];
  value: T;
  onChange: (key: T) => void;
};

const SEGMENT_HEIGHT = 42;
/** 略收紧，选中胶囊嵌在轨内，减少「浮块」感 */
const INSET_V = 4;
const INSET_H = 3;

/**
 * 广场顶部分段：brandMuted 轨 + 同系半透明选中抬升 + 水滴动效
 * 因位于 BlurTargetSurface 内，禁止嵌套真 BlurView
 */
export function SegmentGlassTabs<T extends string>({
  items,
  value,
  onChange,
}: SegmentGlassTabsProps<T>) {
  const [layouts, setLayouts] = useState<Partial<Record<T, SegmentLayout>>>({});
  const { brandMuted, brand, border, surface, textSecondary } = lightTokens.color;

  // 半透明 surface 叠在 brandMuted 上：同系抬升，避免实心白块突兀
  const activeFill = hexToRgba(surface, 0.72);
  const activeBorder = hexToRgba(surface, 0.4);

  const indicatorFrame = useMemo((): TabIndicatorFrame | null => {
    const layout = layouts[value];
    if (!layout || layout.width <= 0) return null;
    return {
      x: layout.x + INSET_H,
      y: INSET_V,
      width: Math.max(0, layout.width - INSET_H * 2),
      height: Math.max(0, SEGMENT_HEIGHT - INSET_V * 2),
    };
  }, [layouts, value]);

  const onItemLayout = useCallback((key: T, event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setLayouts((prev) => {
      const cur = prev[key];
      if (cur && cur.x === x && cur.y === y && cur.width === width && cur.height === height) {
        return prev;
      }
      return { ...prev, [key]: { x, y, width, height } };
    });
  }, []);

  return (
    <View style={[styles.shell, { height: SEGMENT_HEIGHT }]}>
      <View
        pointerEvents="none"
        style={[
          styles.track,
          {
            backgroundColor: brandMuted,
            borderColor: border,
          },
        ]}
      />
      <View style={styles.row}>
        <TabLiquidIndicator
          frame={indicatorFrame}
          surface="frost"
          frostFill={activeFill}
          frostBorder={activeBorder}
        />
        {items.map((item) => {
          const focused = item.key === value;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => onChange(item.key)}
              onLayout={(e) => onItemLayout(item.key, e)}
              style={styles.item}
            >
              <Text
                style={[
                  styles.label,
                  {
                    color: focused ? brand : textSecondary,
                    fontWeight: focused ? "700" : "500",
                    opacity: focused ? 1 : 0.78,
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: lightTokens.radius.full,
    overflow: "hidden",
  },
  track: {
    ...StyleSheet.absoluteFill,
    borderRadius: lightTokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: 3,
    zIndex: 1,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  label: {
    fontSize: lightTokens.fontSize.sm,
    letterSpacing: 0.2,
  },
});

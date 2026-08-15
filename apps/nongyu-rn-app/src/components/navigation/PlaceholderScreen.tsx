import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { createThemedStyles } from "@/theme/createThemedStyles";

type PlaceholderScreenProps = {
  title: string;
  subtitle: string;
};

/**
 * 模块占位页：底部铺高对比色带，便于底栏毛玻璃透出「透视」感
 */
export function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const stripeW = width / 5;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.hint}>向下滑动，让底部彩色条经过悬浮栏，可更明显看到毛玻璃透视。</Text>

        {/* 中部色块 */}
        <View style={styles.midBand}>
          <View style={[styles.orb, styles.orbA]} />
          <View style={[styles.orb, styles.orbB]} />
          <View style={[styles.orb, styles.orbC]} />
        </View>

        {/* 底部高对比竖条：滚动到栏后应被模糊透出 */}
        <View style={styles.bottomCanvas}>
          {["#66BB6A", "#42A5F5", "#AB47BC", "#FFA726", "#26C6DA"].map((color, i) => (
            <View
              key={color}
              style={[styles.stripe, { width: stripeW, backgroundColor: color, left: stripeW * i }]}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  scrollContent: {
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.xl * 2,
    paddingBottom: t.tabBar.heightMax + t.tabBar.bottomGapMax + t.space.xl * 2,
  },
  title: {
    fontSize: t.fontSize.xl,
    color: t.color.brand,
    fontWeight: "700",
    marginBottom: t.space.sm,
  },
  subtitle: {
    fontSize: t.fontSize.md,
    color: t.color.textSecondary,
    lineHeight: 24,
    marginBottom: t.space.md,
  },
  hint: {
    fontSize: t.fontSize.sm,
    color: t.color.brand,
    lineHeight: 20,
    marginBottom: t.space.lg,
  },
  midBand: {
    height: 220,
    marginBottom: t.space.lg,
    borderRadius: t.radius.lg,
    overflow: "hidden",
    backgroundColor: t.color.brandMuted,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.85,
  },
  orbA: {
    width: 160,
    height: 160,
    backgroundColor: "#81C784",
    top: -20,
    right: -30,
  },
  orbB: {
    width: 120,
    height: 120,
    backgroundColor: "#64B5F6",
    bottom: -10,
    left: 20,
  },
  orbC: {
    width: 90,
    height: 90,
    backgroundColor: "#CE93D8",
    top: 60,
    left: 120,
  },
  bottomCanvas: {
    height: 280,
    borderRadius: t.radius.lg,
    overflow: "hidden",
    position: "relative",
  },
  stripe: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
}));

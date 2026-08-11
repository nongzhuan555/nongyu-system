import { StyleSheet, Text, View } from "react-native";
import { lightTokens } from "@/theme/tokens";

type PlaceholderScreenProps = {
  title: string;
  subtitle: string;
};

/**
 * 模块占位页：带轻色块背景，便于底栏毛玻璃透出层次
 */
export function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.blob, styles.blobPrimary]} />
      <View style={[styles.blob, styles.blobSecondary]} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTokens.color.background,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.55,
  },
  blobPrimary: {
    width: 220,
    height: 220,
    backgroundColor: lightTokens.color.brandMuted,
    top: -40,
    right: -50,
  },
  blobSecondary: {
    width: 180,
    height: 180,
    backgroundColor: "#DCEEE0",
    bottom: 120,
    left: -60,
  },
  content: {
    flex: 1,
    paddingHorizontal: lightTokens.space.lg,
    paddingTop: lightTokens.space.xl * 2,
    /** 为悬浮底栏预留空间，避免文案贴底 */
    paddingBottom: lightTokens.tabBar.height + lightTokens.space.xl,
  },
  title: {
    fontSize: lightTokens.fontSize.xl,
    color: lightTokens.color.brand,
    fontWeight: "700",
    marginBottom: lightTokens.space.sm,
  },
  subtitle: {
    fontSize: lightTokens.fontSize.md,
    color: lightTokens.color.textSecondary,
    lineHeight: 24,
  },
});

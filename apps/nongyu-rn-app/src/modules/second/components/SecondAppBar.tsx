import { useThemeTokens } from "@/theme/ThemeProvider";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createThemedStyles } from "@/theme/createThemedStyles";

type SecondAppBarProps = {
  title: string;
  /** 透明顶栏（叠在品牌色头图上） */
  transparent?: boolean;
  right?: ReactNode;
};

/**
 * 二课顶栏：对齐旧版 Appbar（品牌底 + 白字，或透明白字）
 */
export function SecondAppBar({ title, transparent, right }: SecondAppBarProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top },
        transparent ? styles.barTransparent : styles.barSolid,
      ]}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={t.color.onBrand} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.right}>{right ?? <View style={styles.spacer} />}</View>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  bar: {
    zIndex: 2,
  },
  barSolid: {
    backgroundColor: t.color.brand,
  },
  barTransparent: {
    backgroundColor: "transparent",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: t.space.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: t.fontSize.lg,
    fontWeight: "700",
    color: t.color.onBrand,
  },
  right: { minWidth: 40, alignItems: "flex-end" },
  spacer: { width: 40 },
}));

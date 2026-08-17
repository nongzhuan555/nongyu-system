import { useThemeTokens } from "@/theme/ThemeProvider";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppLinearGradient } from "@/components/ui/AppLinearGradient";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { SecondServiceList } from "@/modules/second/components/SecondServiceList";
import { useSecondAuth } from "@/modules/second/hooks/useSecondAuth";

/**
 * 二课首页：主题渐变头图 + 简约入口
 */
export function SecondHomeScreen() {
  const styles = useStyles();
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSecondAuthed } = useSecondAuth();

  return (
    <View style={styles.root}>
      <View style={styles.headerBackground}>
        <AppLinearGradient
          colors={[t.color.brand, t.color.onPrimaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerPattern}>
          <Ionicons
            name="trophy-outline"
            size={180}
            color="rgba(255,255,255,0.07)"
            style={styles.bgIcon}
          />
        </View>
      </View>

      <View style={{ paddingTop: insets.top }}>
        <View style={styles.navRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回"
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={t.color.onBrand} />
          </Pressable>
          {!isSecondAuthed ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="登录二课"
              onPress={() => router.push("/home/second/login" as Href)}
              style={styles.loginLink}
            >
              <Text style={styles.loginLinkText}>登录</Text>
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>二课中心</Text>
          <Text style={styles.headerSubtitle}>i川农核心功能集成（不含二课活动报名）</Text>
        </View>

        <SecondServiceList isAuthenticated={isSecondAuthed} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>农屿工作室</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.color.background,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
  },
  headerPattern: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingTop: 40,
  },
  bgIcon: {
    transform: [{ rotate: "-15deg" }],
    marginRight: -20,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: t.space.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loginLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loginLinkText: {
    color: t.color.onBrand,
    fontWeight: "600",
    fontSize: t.fontSize.md,
  },
  content: {
    padding: 24,
  },
  headerTitleContainer: {
    marginBottom: 40,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  headerTitle: {
    color: t.color.onBrand,
    fontWeight: "800",
    fontSize: 34,
    marginBottom: 8,
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.88)",
    letterSpacing: 0.5,
    fontWeight: "500",
    fontSize: t.fontSize.md,
  },
  footer: {
    marginTop: 60,
    alignItems: "center",
  },
  footerText: {
    color: t.color.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontSize: 10,
  },
}));

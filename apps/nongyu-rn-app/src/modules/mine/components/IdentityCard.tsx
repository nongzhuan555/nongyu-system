import { StyleSheet, Text, View } from "react-native";
import { AppLinearGradient } from "@/components/ui/AppLinearGradient";
import { avatarGradientFor } from "@/modules/mine/constants/avatar";
import { lightTokens } from "@/theme/tokens";

type IdentityCardProps = {
  name: string;
  studentId: string;
};

/**
 * 身份卡：渐变底 + 首字头像 + 姓名学号
 */
export function IdentityCard({ name, studentId }: IdentityCardProps) {
  const displayName = name.trim() || "同学";
  const avatarText = displayName.slice(0, 1);
  const avatarColors = avatarGradientFor(studentId || displayName);

  return (
    <View style={styles.card}>
      <AppLinearGradient
        colors={[lightTokens.color.brand, lightTokens.color.tertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.avatarShadow}>
            <AppLinearGradient
              colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.3)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarBorder}
            >
              <AppLinearGradient
                colors={avatarColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarInner}
              >
                <Text style={styles.avatarText}>{avatarText}</Text>
              </AppLinearGradient>
            </AppLinearGradient>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.welcome}>Welcome back,</Text>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.idTag}>
              <Text style={styles.idText}>{studentId || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.circle1} pointerEvents="none" />
        <View style={styles.circle2} pointerEvents="none" />
      </AppLinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#0A7C59",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  gradient: {
    position: "relative",
    padding: lightTokens.space.lg,
    minHeight: 140,
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  avatarShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarBorder: {
    padding: 3,
    borderRadius: 40,
  },
  avatarInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.12)",
    textShadowRadius: 4,
  },
  userInfo: {
    marginLeft: 20,
    flex: 1,
  },
  welcome: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginBottom: 4,
    fontWeight: "500",
  },
  name: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  idTag: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  idText: {
    fontSize: 12,
    fontWeight: "700",
    color: lightTokens.color.brand,
  },
  circle1: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.1)",
    top: -40,
    right: -20,
  },
  circle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -20,
    left: -10,
  },
});

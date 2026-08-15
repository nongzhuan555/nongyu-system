import { View } from "react-native";
import { TypewriterText } from "@/components/ui/TypewriterText";
import { GREETING_RESERVED_HEIGHT, buildGreetingText } from "@/modules/home/constants/greeting";
import { useSessionStore } from "@/stores/session";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 时段问候 + 打字机（按约 2 行预留，避免与通知栏间距过大）
 */
export function Greeting() {
  const styles = useStyles();
  const name = useSessionStore((s) => s.profile?.name);
  const fullText = buildGreetingText(name);

  return (
    <View style={styles.wrap}>
      <TypewriterText fullText={fullText} style={styles.text} numberOfLines={2} lastCharBoost={3} />
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  wrap: {
    width: "100%",
    paddingHorizontal: t.space.md,
    paddingTop: 0,
    paddingBottom: 4,
  },
  text: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: 0.2,
    color: t.color.brand,
    minHeight: GREETING_RESERVED_HEIGHT,
  },
}));

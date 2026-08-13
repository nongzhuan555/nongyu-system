import { StyleSheet, Text, View } from "react-native";
import { GREETING_RESERVED_HEIGHT, buildGreetingText } from "@/modules/home/constants/greeting";
import { useTypewriter } from "@/modules/home/hooks/useTypewriter";
import { lightTokens } from "@/theme/tokens";

/**
 * 时段问候 + 打字机（按约 2 行预留，避免与通知栏间距过大）
 */
export function Greeting() {
  const fullText = buildGreetingText();
  const displayText = useTypewriter(fullText);

  return (
    <View style={styles.wrap}>
      <Text style={styles.text} numberOfLines={2}>
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingHorizontal: lightTokens.space.md,
    paddingTop: 0,
    paddingBottom: 4,
  },
  text: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: 0.2,
    color: lightTokens.color.brand,
    minHeight: GREETING_RESERVED_HEIGHT,
  },
});

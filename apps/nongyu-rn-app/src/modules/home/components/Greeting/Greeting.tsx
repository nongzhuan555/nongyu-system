import { View } from "react-native";
import { TypewriterText } from "@/components/ui/TypewriterText";
import { GreetingSkeleton } from "@/modules/home/components/Greeting/GreetingSkeleton";
import { GREETING_MAX_LINES, GREETING_RESERVED_HEIGHT } from "@/modules/home/constants/greeting";
import { useGreetingBootstrap } from "@/modules/home/hooks/useGreetingBootstrap";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 时段问候 + 运营第二句；骨架等数据齐后再打字机
 */
export function Greeting() {
  const styles = useStyles();
  const { loading, fullText } = useGreetingBootstrap();

  if (loading) {
    return <GreetingSkeleton />;
  }

  return (
    <View style={styles.wrap}>
      <TypewriterText
        fullText={fullText}
        style={styles.text}
        numberOfLines={GREETING_MAX_LINES}
        lastCharBoost={3}
      />
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

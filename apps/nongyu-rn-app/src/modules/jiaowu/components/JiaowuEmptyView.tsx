import { StyleSheet, Text, View } from "react-native";
import { lightTokens } from "@/theme/tokens";

type JiaowuEmptyViewProps = {
  text?: string;
};

/**
 * 教务空态
 */
export function JiaowuEmptyView({ text = "暂无数据" }: JiaowuEmptyViewProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: lightTokens.space.xl,
  },
  text: {
    fontSize: lightTokens.fontSize.md,
    color: lightTokens.color.textSecondary,
  },
});

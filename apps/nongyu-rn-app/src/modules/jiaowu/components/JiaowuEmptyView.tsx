import { StyleSheet, Text, View } from "react-native";
import { createThemedStyles } from "@/theme/createThemedStyles";

type JiaowuEmptyViewProps = {
  text?: string;
};

/**
 * 教务空态
 */
export function JiaowuEmptyView({ text = "暂无数据" }: JiaowuEmptyViewProps) {
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: t.space.xl,
  },
  text: {
    fontSize: t.fontSize.md,
    color: t.color.textSecondary,
  },
}));

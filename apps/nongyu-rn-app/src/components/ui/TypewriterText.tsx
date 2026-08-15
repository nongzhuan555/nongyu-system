import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { useTypewriter } from "@/modules/home/hooks/useTypewriter";

type TypewriterTextProps = {
  fullText: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  intervalMs?: number;
  /** false 时不播放并清空（如气泡隐藏） */
  active?: boolean;
  /** 打字过程中末字相对正文字号的增量（打完后统一） */
  lastCharBoost?: number;
};

/**
 * 打字机文案：逐字出现；未打完时末字略大，打完后字号统一
 */
export function TypewriterText({
  fullText,
  style,
  numberOfLines,
  intervalMs = 40,
  active = true,
  lastCharBoost = 2,
}: TypewriterTextProps) {
  const { displayText, done } = useTypewriter(fullText, { intervalMs, active });
  const flat = StyleSheet.flatten(style) ?? {};
  const baseSize = typeof flat.fontSize === "number" ? flat.fontSize : 14;

  if (done || displayText.length === 0) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {displayText}
      </Text>
    );
  }

  const prefix = displayText.slice(0, -1);
  const lastChar = displayText.slice(-1);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {prefix}
      <Text style={[style, { fontSize: baseSize + lastCharBoost }]}>{lastChar}</Text>
    </Text>
  );
}

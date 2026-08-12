import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { HomeSurface } from "@/modules/home/components/HomeSurface";
import { WEB_NAV_ITEMS } from "@/modules/home/constants/webNav";
import { lightTokens } from "@/theme/tokens";
import { WEB_NAV_ITEM_HEIGHT, WebNavItemView } from "./WebNavItemView";

/** 栅格：行间距与上下内边距 */
const ROW_GAP = 10;
const PANEL_PAD_V = 10;
/** 可视区域恰好 3 行：3×行高 + 2×行间距 + 上下 padding */
const PANEL_HEIGHT = WEB_NAV_ITEM_HEIGHT * 3 + ROW_GAP * 2 + PANEL_PAD_V * 2;

/**
 * 常用网站：搜索 + 栅格；外开系统浏览器
 * 面板固定 3 行可视高度，超出纵向滚动
 */
export function WebNav() {
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    const val = keyword.trim();
    if (!val) return WEB_NAV_ITEMS;
    return WEB_NAV_ITEMS.filter((item) => item.text.includes(val));
  }, [keyword]);

  const openUrl = async (url: string, title: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Toast.show({ type: "error", text1: "无法打开链接", text2: title });
        return;
      }
      await Linking.openURL(url);
    } catch {
      Toast.show({ type: "error", text1: "打开失败", text2: title });
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleDot} />
          <Text style={styles.title}>常用网站</Text>
        </View>
        <Text style={styles.sub}>{`${filtered.length} 个站点`}</Text>
      </View>

      <View style={styles.search}>
        <Ionicons
          name="search"
          size={15}
          color={lightTokens.color.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          placeholder="搜索网站"
          placeholderTextColor={lightTokens.color.textSecondary}
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      <HomeSurface padded={false}>
        <View style={[styles.panel, { height: PANEL_HEIGHT }]}>
          <ScrollView
            nestedScrollEnabled
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {filtered.map((item) => (
              <WebNavItemView
                key={item.text}
                item={item}
                onPress={(it) => openUrl(it.url, it.text)}
              />
            ))}
          </ScrollView>
        </View>
      </HomeSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingHorizontal: lightTokens.space.md,
    paddingBottom: lightTokens.space.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: lightTokens.color.brand,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: lightTokens.color.text,
  },
  sub: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.2,
    color: lightTokens.color.textSecondary,
  },
  search: {
    marginBottom: 10,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: lightTokens.color.text,
    paddingVertical: 0,
  },
  panel: {
    overflow: "hidden",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingVertical: PANEL_PAD_V,
    rowGap: ROW_GAP,
  },
});

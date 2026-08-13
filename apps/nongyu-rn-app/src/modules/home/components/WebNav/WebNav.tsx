import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { toast } from "@/components/ui/toast";
import { HomeSurface } from "@/modules/home/components/HomeSurface";
import { HOME_FIELD_CHROME } from "@/modules/home/constants/fieldChrome";
import { WEB_NAV_ITEMS, type WebNavItem } from "@/modules/home/constants/webNav";
import { lightTokens } from "@/theme/tokens";
import { WEB_NAV_ITEM_HEIGHT, WebNavItemView } from "./WebNavItemView";

/** 栅格：行间距与上下内边距 */
const ROW_GAP = 10;
const PANEL_PAD_V = 10;
/** 可视区域恰好 3 行：3×行高 + 2×行间距 + 上下 padding */
const PANEL_HEIGHT = WEB_NAV_ITEM_HEIGHT * 3 + ROW_GAP * 2 + PANEL_PAD_V * 2;

/**
 * 模拟「远程搜索」固定耗时（毫秒）。
 * 当前站点列表仍是本地常量，仅用延迟 + loading 态做出抓取等待感；日后接真接口时替换此定时器即可。
 */
const SEARCH_REMOTE_MOCK_MS = 300;

/**
 * 常用网站：搜索 + 栅格；外开系统浏览器
 * 面板固定 3 行可视高度，超出纵向滚动
 */
export function WebNav() {
  const [keyword, setKeyword] = useState("");
  /** 真正渲染的列表（受模拟远程延迟约束，勿与 keyword 同步即时计算） */
  const [displayItems, setDisplayItems] = useState<WebNavItem[]>(WEB_NAV_ITEMS);
  /** 搜索中：展示加载等待，营造远程抓取感 */
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const val = keyword.trim();

    // 清空搜索：立刻回全量，不做假延迟
    if (!val) {
      setDisplayItems(WEB_NAV_ITEMS);
      setSearching(false);
      return;
    }

    // 有关键词：先进入 loading，固定等 SEARCH_REMOTE_MOCK_MS 再过滤落地
    setSearching(true);
    const timer = setTimeout(() => {
      setDisplayItems(WEB_NAV_ITEMS.filter((item) => item.text.includes(val)));
      setSearching(false);
    }, SEARCH_REMOTE_MOCK_MS);

    // 输入连打时取消上一次定时器，只保留最后一次「请求」
    return () => clearTimeout(timer);
  }, [keyword]);

  const openUrl = async (url: string, title: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        toast.error("无法打开链接", { description: title });
        return;
      }
      await Linking.openURL(url);
    } catch {
      toast.error("打开失败", { description: title });
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleDot} />
          <Text style={styles.title}>常用网站</Text>
        </View>
        <Text style={styles.sub}>{searching ? "搜索中…" : `${displayItems.length} 个站点`}</Text>
      </View>

      {/*
        搜索框玻璃拟态：用半透明白底+描边模拟，勿在 BlurTargetView 内再套 BlurView
        （Android 嵌套真模糊易原生闪退）。真模糊仅用于悬浮底栏外侧 GlassPanel。
      */}
      <View style={styles.searchGlass}>
        <View style={styles.searchFrost} pointerEvents="none" />
        <View style={styles.searchRow}>
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
          {searching ? (
            <ActivityIndicator
              size="small"
              color={lightTokens.color.brand}
              style={styles.searchSpinner}
            />
          ) : null}
        </View>
      </View>

      <HomeSurface padded={false}>
        <View style={[styles.panel, { height: PANEL_HEIGHT }]}>
          {searching ? (
            <View style={styles.loadingBox} accessibilityLabel="正在搜索网站">
              <ActivityIndicator size="small" color={lightTokens.color.brand} />
              <Text style={styles.loadingText}>正在检索…</Text>
            </View>
          ) : (
            <ScrollView
              nestedScrollEnabled
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
            >
              {displayItems.map((item) => (
                <WebNavItemView
                  key={item.text}
                  item={item}
                  onPress={(it) => openUrl(it.url, it.text)}
                />
              ))}
            </ScrollView>
          )}
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
  searchGlass: {
    marginBottom: 10,
    height: HOME_FIELD_CHROME.height,
    borderRadius: HOME_FIELD_CHROME.radius,
    overflow: "hidden",
    borderWidth: HOME_FIELD_CHROME.borderWidth,
    borderColor: HOME_FIELD_CHROME.borderColor,
    backgroundColor: "transparent",
  },
  searchFrost: {
    ...StyleSheet.absoluteFill,
    backgroundColor: HOME_FIELD_CHROME.frost,
  },
  searchRow: {
    flex: 1,
    height: HOME_FIELD_CHROME.height,
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
    backgroundColor: "transparent",
  },
  searchSpinner: {
    marginLeft: 8,
  },
  panel: {
    overflow: "hidden",
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "500",
    color: lightTokens.color.textSecondary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingVertical: PANEL_PAD_V,
    rowGap: ROW_GAP,
  },
});

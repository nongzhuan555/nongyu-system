import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EntryCard } from "@/modules/home/components/EntryCard/EntryCard";
import { Greeting } from "@/modules/home/components/Greeting/Greeting";
import { HomeBackground } from "@/modules/home/components/HomeBackground";
import { NoticeBar } from "@/modules/home/components/NoticeBar/NoticeBar";
import { SocialCopyCard } from "@/modules/home/components/SocialCopyCard/SocialCopyCard";
import { WebNav } from "@/modules/home/components/WebNav/WebNav";
import { lightTokens } from "@/theme/tokens";

/**
 * 首页主界面组装
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <HomeBackground />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + lightTokens.space.md,
            paddingBottom:
              lightTokens.tabBar.heightMax + lightTokens.tabBar.bottomGapMax + lightTokens.space.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Greeting />
        <NoticeBar />
        <WebNav />
        <EntryCard />
        <SocialCopyCard />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: lightTokens.color.background,
  },
  content: {
    paddingBottom: lightTokens.space.lg,
  },
});

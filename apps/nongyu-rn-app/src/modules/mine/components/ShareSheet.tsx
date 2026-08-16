import { useThemeTokens } from "@/theme/ThemeProvider";
import { type ComponentProps, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { toast } from "@/components/ui/toast";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { SHARE_WEBPAGE_URL } from "@/modules/mine/constants/share";
import {
  isWechatNativeAvailable,
  shareNongyuWebpage,
  type WechatShareSceneKind,
} from "@/lib/wechat";
import { trackClick } from "@/modules/telemetry";

type ShareSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type ShareAction = {
  key: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  iconBg: string;
  iconColor: string;
  kind: "wechat" | "moments" | "copy";
};

const ACTIONS: ShareAction[] = [
  {
    key: "wechat",
    label: "微信好友",
    icon: "logo-wechat",
    iconBg: "#E7FAF0",
    iconColor: "#07C160",
    kind: "wechat",
  },
  {
    key: "moments",
    label: "朋友圈",
    icon: "images-outline",
    iconBg: "#E7FAF0",
    iconColor: "#07C160",
    kind: "moments",
  },
  {
    key: "copy",
    label: "复制链接",
    icon: "link-outline",
    iconBg: "#F0F2F5",
    iconColor: "#666666",
    kind: "copy",
  },
];

/**
 * 「分享农屿」底部面板：微信好友 / 朋友圈 / 复制官网链接
 */
export function ShareSheet({ visible, onClose }: ShareSheetProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const [busy, setBusy] = useState(false);

  const runWechatShare = async (scene: WechatShareSceneKind, eventName: string) => {
    if (busy) return;
    trackClick(eventName);
    if (!isWechatNativeAvailable()) {
      toast.info("需原生构建", {
        description: "请使用 Dev Client 或正式包后再试微信分享",
      });
      return;
    }
    setBusy(true);
    try {
      await shareNongyuWebpage(scene);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "请稍后重试";
      toast.error("分享失败", { description: msg });
    } finally {
      setBusy(false);
    }
  };

  const runCopyLink = async () => {
    if (busy) return;
    trackClick("share_copy_link");
    setBusy(true);
    try {
      await Clipboard.setStringAsync(SHARE_WEBPAGE_URL);
      toast.success("链接已复制");
      onClose();
    } catch {
      toast.error("复制失败", { description: "请稍后重试" });
    } finally {
      setBusy(false);
    }
  };

  const onPressAction = (action: ShareAction) => {
    if (action.kind === "copy") {
      void runCopyLink();
      return;
    }
    if (action.kind === "wechat") {
      void runWechatShare("session", "share_wechat");
      return;
    }
    void runWechatShare("timeline", "share_moments");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.mask} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>分享给好友</Text>
            {busy ? <ActivityIndicator size="small" color={t.color.brand} /> : null}
          </View>

          <View style={styles.grid}>
            {ACTIONS.map((action) => (
              <Pressable
                key={action.key}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                disabled={busy}
                onPress={() => onPressAction(action)}
                style={({ pressed }) => [
                  styles.gridItem,
                  pressed && styles.pressed,
                  busy && styles.disabled,
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: action.iconBg }]}>
                  <Ionicons name={action.icon} size={26} color={action.iconColor} />
                </View>
                <Text style={styles.gridLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            onPress={onClose}
            disabled={busy}
          >
            <Text style={styles.cancelText}>取消</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = createThemedStyles((t) => ({
  mask: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: t.color.surface,
    paddingBottom: t.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  title: {
    textAlign: "center",
    fontSize: t.fontSize.md,
    fontWeight: "700",
    color: t.color.text,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: t.space.md,
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: t.space.md,
    paddingBottom: t.space.md,
  },
  gridItem: {
    alignItems: "center",
    width: "28%",
    gap: 8,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  gridLabel: {
    fontSize: 12,
    color: t.color.textSecondary,
  },
  cancel: {
    marginHorizontal: t.space.md,
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.color.border,
  },
  cancelText: {
    fontSize: t.fontSize.md,
    color: t.color.text,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
}));

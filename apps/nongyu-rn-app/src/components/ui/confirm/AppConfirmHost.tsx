import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { settleConfirm, subscribeConfirm } from "./confirmApi";
import type { ConfirmRequest } from "./types";
import { createThemedStyles } from "@/theme/createThemedStyles";

/**
 * 全局确认框 Host：居中卡片 + 墨绿蒙层
 */
export function AppConfirmHost() {
  const styles = useStyles();
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => subscribeConfirm(setRequest), []);

  const visible = !!request;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => settleConfirm(false)}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭"
          style={styles.scrim}
          onPress={() => settleConfirm(false)}
        />
        {request ? (
          <View style={styles.card} accessibilityRole="alert">
            <View style={styles.brandEdge} />
            <Text style={styles.title}>{request.title}</Text>
            {request.message ? <Text style={styles.message}>{request.message}</Text> : null}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={request.cancelText}
                onPress={() => settleConfirm(false)}
                style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.pressed]}
              >
                <Text style={styles.btnCancelText}>{request.cancelText}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={request.confirmText}
                onPress={() => settleConfirm(true)}
                style={({ pressed }) => [
                  styles.btn,
                  request.destructive ? styles.btnDanger : styles.btnConfirm,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={request.destructive ? styles.btnDangerText : styles.btnConfirmText}>
                  {request.confirmText}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const useStyles = createThemedStyles((t) => ({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 36,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(27, 43, 27, 0.42)",
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    backgroundColor: t.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 124, 89, 0.12)",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    overflow: "hidden",
    shadowColor: "#0A7C59",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
    zIndex: 2,
  },
  /** 顶缘品牌细条：确认层签名 */
  brandEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: t.color.brand,
    opacity: 0.75,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: t.color.text,
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  message: {
    fontSize: 13,
    lineHeight: 21,
    color: t.color.textSecondary,
    marginBottom: 22,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancel: {
    backgroundColor: t.color.brandMuted,
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: t.color.brand,
  },
  btnConfirm: {
    backgroundColor: t.color.brand,
  },
  btnConfirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: t.color.onBrand,
  },
  btnDanger: {
    backgroundColor: "rgba(220, 38, 38, 0.1)",
  },
  btnDangerText: {
    fontSize: 15,
    fontWeight: "600",
    color: t.color.danger,
  },
  pressed: {
    opacity: 0.86,
  },
}));

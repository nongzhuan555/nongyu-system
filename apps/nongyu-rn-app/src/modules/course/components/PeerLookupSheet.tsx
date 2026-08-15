import { useThemeTokens } from "@/theme/ThemeProvider";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createThemedStyles } from "@/theme/createThemedStyles";

type PeerLookupSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (studentNo: string) => Promise<void>;
};

/**
 * 输入学号查找他人课表
 */
export function PeerLookupSheet({ visible, onClose, onSubmit }: PeerLookupSheetProps) {
  const styles = useStyles();
  const t = useThemeTokens();
  const [studentNo, setStudentNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const reset = () => {
    setStudentNo("");
    setLocalError(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = studentNo.trim();
    if (!/^\d{9}$/.test(trimmed)) {
      setLocalError("请输入 9 位数字学号");
      return;
    }
    setLocalError(null);
    setLoading(true);
    try {
      await onSubmit(trimmed);
      reset();
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "查找失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>查看他人课表</Text>
          <Text style={styles.desc}>输入对方学号（对方需已开启课表共享）</Text>
          <TextInput
            style={styles.input}
            value={studentNo}
            onChangeText={setStudentNo}
            keyboardType="number-pad"
            maxLength={9}
            placeholder="9 位学号"
            placeholderTextColor={t.color.textSecondary}
            autoFocus
          />
          {localError ? <Text style={styles.error}>{localError}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnGhost]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.btnGhostText}>取消</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => void handleSubmit()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={t.color.onBrand} />
              ) : (
                <Text style={styles.btnPrimaryText}>查找</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = createThemedStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: t.space.lg,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    padding: t.space.lg,
    gap: t.space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
  },
  title: {
    fontSize: t.fontSize.lg,
    fontWeight: "700",
    color: t.color.text,
  },
  desc: {
    fontSize: t.fontSize.sm,
    color: t.color.textSecondary,
    marginBottom: 4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    borderRadius: t.radius.md,
    paddingHorizontal: t.space.md,
    paddingVertical: 12,
    fontSize: t.fontSize.md,
    color: t.color.text,
    backgroundColor: t.color.surfaceVariant,
  },
  error: {
    fontSize: t.fontSize.sm,
    color: t.color.danger,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: t.space.sm,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: t.radius.md,
    minHeight: 44,
  },
  btnPrimary: {
    backgroundColor: t.color.brand,
  },
  btnPrimaryText: {
    color: t.color.onBrand,
    fontWeight: "700",
  },
  btnGhost: {
    backgroundColor: t.color.brandMuted,
  },
  btnGhostText: {
    color: t.color.brand,
    fontWeight: "600",
  },
}));

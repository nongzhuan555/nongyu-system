import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { createThemedStyles } from "@/theme/createThemedStyles";

type CellActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAddSchedule: () => void;
};

/**
 * 有课格长按：简易操作表（不引第三方 ActionSheet）
 */
export function CellActionSheet({ visible, onClose, onAddSchedule }: CellActionSheetProps) {
  const styles = useStyles();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.mask} onPress={onClose}>
        <View style={styles.sheet}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => {
              onClose();
              onAddSchedule();
            }}
          >
            <Text style={styles.rowText}>添加日程</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.row, styles.cancel, pressed && styles.rowPressed]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>取消</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const useStyles = createThemedStyles((t) => ({
  mask: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
    padding: 16,
  },
  sheet: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: t.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${t.color.brand}22`,
  },
  row: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowText: {
    fontSize: 16,
    fontWeight: "600",
    color: t.color.brand,
  },
  cancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: `${t.color.textSecondary}22`,
  },
  cancelText: {
    fontSize: 16,
    color: t.color.textSecondary,
  },
}));

import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { createThemedStyles } from "@/theme/createThemedStyles";

type SemesterStartPickerProps = {
  visible: boolean;
  initialDate: Date;
  onConfirm: (date: Date) => void;
  onDismiss: () => void;
};

/**
 * 开学日选择：Android 系统对话框；iOS 底部确认条
 */
export function SemesterStartPicker({
  visible,
  initialDate,
  onConfirm,
  onDismiss,
}: SemesterStartPickerProps) {
  const styles = useStyles();
  const [draft, setDraft] = useState(initialDate);

  useEffect(() => {
    if (visible) setDraft(initialDate);
  }, [visible, initialDate]);

  if (!visible) return null;

  const onChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "dismissed") {
        onDismiss();
        return;
      }
      if (date) onConfirm(date);
      return;
    }
    if (date) setDraft(date);
  };

  if (Platform.OS === "android") {
    return <DateTimePicker value={initialDate} mode="date" display="default" onChange={onChange} />;
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <Pressable style={styles.mask} onPress={onDismiss}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.toolbar}>
            <Pressable onPress={onDismiss} hitSlop={8}>
              <Text style={styles.cancel}>取消</Text>
            </Pressable>
            <Text style={styles.title}>开学日期</Text>
            <Pressable onPress={() => onConfirm(draft)} hitSlop={8}>
              <Text style={styles.ok}>确定</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            onChange={onChange}
            style={styles.picker}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = createThemedStyles((t) => ({
  mask: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: t.color.background,
    borderTopLeftRadius: t.radius.lg,
    borderTopRightRadius: t.radius.lg,
    paddingBottom: t.space.lg,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.color.border,
  },
  title: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.text,
  },
  cancel: {
    fontSize: t.fontSize.md,
    color: t.color.textSecondary,
  },
  ok: {
    fontSize: t.fontSize.md,
    fontWeight: "600",
    color: t.color.brand,
  },
  picker: {
    alignSelf: "stretch",
  },
}));

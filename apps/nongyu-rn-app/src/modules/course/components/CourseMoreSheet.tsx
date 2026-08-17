import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { trackClick } from "@/modules/telemetry";
import { useThemeTokens } from "@/theme/ThemeProvider";
import { createThemedStyles } from "@/theme/createThemedStyles";

type CourseMoreSheetProps = {
  visible: boolean;
  refreshing: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onShare: () => void;
  /** 查看我的自定义日程列表 */
  onMySchedules: () => void;
};

/**
 * 课表页头「更多」：刷新课表 / 共享课表 / 我的自定义日程
 */
export function CourseMoreSheet({
  visible,
  refreshing,
  onClose,
  onRefresh,
  onShare,
  onMySchedules,
}: CourseMoreSheetProps) {
  const styles = useStyles();
  const t = useThemeTokens();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.mask} onPress={onClose}>
        <View style={styles.sheet}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => {
              if (refreshing) return;
              trackClick("course_refresh");
              onClose();
              onRefresh();
            }}
            disabled={refreshing}
            accessibilityLabel="刷新课表"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={t.color.brand} />
            ) : (
              <Ionicons name="refresh" size={20} color={t.color.brand} />
            )}
            <Text style={styles.rowText}>刷新课表</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => {
              trackClick("course_open_peer_lookup");
              onClose();
              onShare();
            }}
            accessibilityLabel="查看他人课表"
          >
            <Ionicons name="people-outline" size={20} color={t.color.brand} />
            <Text style={styles.rowText}>查看他人课表（可看课程差异）</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => {
              onClose();
              onMySchedules();
            }}
            accessibilityLabel="查看我的自定义日程"
          >
            <Ionicons name="calendar-outline" size={20} color={t.color.brand} />
            <Text style={styles.rowText}>查看我的自定义日程</Text>
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
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
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

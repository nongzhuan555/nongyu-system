import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

const BG_DIR = "course-bg";
const BG_FILE = "background.jpg";

function bgDirUri(): string {
  return `${FileSystem.documentDirectory}${BG_DIR}/`;
}

function bgFileUri(): string {
  return `${bgDirUri()}${BG_FILE}`;
}

/**
 * 从相册选图并复制到应用文档目录，返回稳定 file URI
 */
export async function pickAndPersistCourseBackground(): Promise<string> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error("需要相册权限才能设置背景图");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    allowsEditing: true,
    aspect: [9, 16],
  });

  if (result.canceled || !result.assets[0]?.uri) {
    throw new Error("CANCELLED");
  }

  const source = result.assets[0].uri;
  const dir = bgDirUri();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const dest = bgFileUri();
  const destInfo = await FileSystem.getInfoAsync(dest);
  if (destInfo.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }
  await FileSystem.copyAsync({ from: source, to: dest });
  // 加 query 打破 Image 缓存
  return `${dest}?t=${Date.now()}`;
}

/**
 * 删除已持久化的课表背景文件
 */
export async function clearPersistedCourseBackground(): Promise<void> {
  const dest = bgFileUri();
  await FileSystem.deleteAsync(dest, { idempotent: true });
}

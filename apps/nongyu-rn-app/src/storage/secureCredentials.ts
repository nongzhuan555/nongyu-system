import * as SecureStore from "expo-secure-store";

const STUDENT_ID_KEY = "jiaowu:student_id";
const PASSWORD_KEY = "jiaowu:password";

export type JiaowuCredentials = {
  studentId: string;
  password: string;
};

/**
 * 从 SecureStore 读取学号与教务密码
 */
export async function loadCredentials(): Promise<JiaowuCredentials | null> {
  const [studentId, password] = await Promise.all([
    SecureStore.getItemAsync(STUDENT_ID_KEY),
    SecureStore.getItemAsync(PASSWORD_KEY),
  ]);
  if (!studentId || !password) return null;
  return { studentId, password };
}

/**
 * 将学号与教务密码写入 SecureStore
 */
export async function saveCredentials(studentId: string, password: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(STUDENT_ID_KEY, studentId),
    SecureStore.setItemAsync(PASSWORD_KEY, password),
  ]);
}

/**
 * 清除 SecureStore 中的教务凭据
 */
export async function clearCredentials(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(STUDENT_ID_KEY),
    SecureStore.deleteItemAsync(PASSWORD_KEY),
  ]);
}

import * as SecureStore from "expo-secure-store";

/**
 * expo-secure-store 仅允许字母数字与 `.` `-` `_`，禁止 `:`（非法 key 会抛错，严重时可拖垮预览稳定性）
 */
const STUDENT_ID_KEY = "jiaowu_student_id";
const PASSWORD_KEY = "jiaowu_password";
const SECOND_PASSWORD_KEY = "second_password";

export type JiaowuCredentials = {
  studentId: string;
  password: string;
};

/**
 * 从 SecureStore 读取学号与教务密码
 */
export async function loadCredentials(): Promise<JiaowuCredentials | null> {
  try {
    const [studentId, password] = await Promise.all([
      SecureStore.getItemAsync(STUDENT_ID_KEY),
      SecureStore.getItemAsync(PASSWORD_KEY),
    ]);
    if (!studentId || !password) return null;
    return { studentId, password };
  } catch (error) {
    console.warn("读取教务凭据失败:", error);
    return null;
  }
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
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(STUDENT_ID_KEY),
      SecureStore.deleteItemAsync(PASSWORD_KEY),
      SecureStore.deleteItemAsync(SECOND_PASSWORD_KEY),
    ]);
  } catch (error) {
    console.warn("清除教务凭据失败:", error);
  }
}

/**
 * 读取二课密码（学号仍用教务 studentId）
 */
export async function loadSecondPassword(): Promise<string | null> {
  try {
    return (await SecureStore.getItemAsync(SECOND_PASSWORD_KEY)) ?? null;
  } catch (error) {
    console.warn("读取二课密码失败:", error);
    return null;
  }
}

/**
 * 写入二课密码
 */
export async function saveSecondPassword(password: string): Promise<void> {
  await SecureStore.setItemAsync(SECOND_PASSWORD_KEY, password);
}

/**
 * 清除二课密码
 */
export async function clearSecondPassword(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SECOND_PASSWORD_KEY);
  } catch (error) {
    console.warn("清除二课密码失败:", error);
  }
}

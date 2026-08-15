import { appStorage } from "@/storage/mmkv";

const SHARE_ENABLED_PREFIX = "course:shareEnabled:";

function shareEnabledKey(studentId: string): string {
  return `${SHARE_ENABLED_PREFIX}${studentId}`;
}

export function readLocalShareEnabled(studentId: string): boolean {
  return appStorage.getString(shareEnabledKey(studentId)) === "1";
}

export function writeLocalShareEnabled(studentId: string, enabled: boolean): void {
  appStorage.set(shareEnabledKey(studentId), enabled ? "1" : "0");
}

export function clearLocalShareEnabled(studentId: string): void {
  appStorage.delete(shareEnabledKey(studentId));
}

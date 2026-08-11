import { MMKV } from "react-native-mmkv";

/**
 * 业务偏好 / 课表缓存等非敏感存储
 * Dev Client 原生可用；Expo Go / 无原生时回退内存 Map，避免骨架阶段直接崩溃
 */
type KvStore = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

function createMemoryStore(): KvStore {
  const map = new Map<string, string>();
  return {
    getString: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
    delete: (key) => {
      map.delete(key);
    },
  };
}

function createMmkvStore(): KvStore {
  const mmkv = new MMKV({ id: "nongyu-app" });
  return {
    getString: (key) => mmkv.getString(key),
    set: (key, value) => {
      mmkv.set(key, value);
    },
    delete: (key) => {
      mmkv.delete(key);
    },
  };
}

let storage: KvStore;

try {
  storage = createMmkvStore();
} catch {
  storage = createMemoryStore();
}

export const appStorage = storage;

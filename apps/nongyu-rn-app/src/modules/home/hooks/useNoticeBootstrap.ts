import { useEffect, useState } from "react";
import { getAppAccessToken } from "@/api/appClient";
import { fetchLatestAnnouncement } from "@/modules/center/api/posts";
import { subtypeLabel } from "@/modules/center/constants/subtypes";
import { FIXED_NOTICE } from "@/modules/home/constants/social";

export type NoticeData = {
  /** 真实公告 id；占位为 null */
  id: number | null;
  typeLabel: string;
  title: string;
  isPlaceholder: boolean;
};

/** 无数据时的显式占位 —— 保证首页通知栏 UI 不消失 */
const PLACEHOLDER_NOTICE: NoticeData = {
  id: null,
  typeLabel: FIXED_NOTICE.typeLabel,
  title: FIXED_NOTICE.title,
  isPlaceholder: true,
};

/**
 * 首页通知栏数据：
 * - 有 Token：拉最新公告
 * - 无 Token / 无数据 / 失败：回退 PLACEHOLDER_NOTICE（禁止返回 null）
 */
export function useNoticeBootstrap(): {
  loading: boolean;
  notice: NoticeData;
} {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeData>(PLACEHOLDER_NOTICE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!getAppAccessToken()) {
        if (!cancelled) {
          setNotice(PLACEHOLDER_NOTICE);
          setLoading(false);
        }
        return;
      }

      try {
        const latest = await fetchLatestAnnouncement();
        if (cancelled) return;
        if (!latest) {
          setNotice(PLACEHOLDER_NOTICE);
          return;
        }
        setNotice({
          id: latest.id,
          typeLabel: subtypeLabel("announcement", latest.subtype),
          title: latest.title,
          isPlaceholder: false,
        });
      } catch {
        if (!cancelled) setNotice(PLACEHOLDER_NOTICE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, notice };
}

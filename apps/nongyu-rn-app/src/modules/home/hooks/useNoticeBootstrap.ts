import { useEffect, useState } from "react";
import { FIXED_NOTICE, NOTICE_MOCK_DELAY_MS } from "@/modules/home/constants/social";

export type NoticeData = {
  typeLabel: string;
  title: string;
};

/**
 * 通知栏引导加载：模拟请求延迟后返回写死数据（接口就绪后替换）
 */
export function useNoticeBootstrap(): {
  loading: boolean;
  notice: NoticeData | null;
} {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setNotice({
        typeLabel: FIXED_NOTICE.typeLabel,
        title: FIXED_NOTICE.title,
      });
      setLoading(false);
    }, NOTICE_MOCK_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return { loading, notice };
}

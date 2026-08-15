import { Tabs } from "antd";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PostListPanel } from "../components/content/PostListPanel";
import { contentTabToPostType, type ContentTabKey } from "../types/posts";

function parseTab(raw: string | null): ContentTabKey {
  if (raw === "feedback" || raw === "suggestion" || raw === "announcement") return raw;
  return "announcement";
}

export function ContentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);

  return (
    <div className="rounded-3xl bg-white p-4 shadow-card md:p-6">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-ink">内容管理</h2>
        <p className="mt-1 text-sm text-muted">管理官方公告与用户反馈、建议</p>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(key) => {
          const next = parseTab(key);
          setSearchParams(next === "announcement" ? {} : { tab: next });
        }}
        items={[
          {
            key: "announcement",
            label: "公告",
            children: (
              <PostListPanel
                postType={contentTabToPostType("announcement")}
                title="官方公告"
                allowCreate
              />
            ),
          },
          {
            key: "feedback",
            label: "反馈",
            children: (
              <PostListPanel
                postType={contentTabToPostType("feedback")}
                title="用户反馈"
                allowCreate={false}
              />
            ),
          },
          {
            key: "suggestion",
            label: "建议",
            children: (
              <PostListPanel
                postType={contentTabToPostType("suggestion")}
                title="用户建议"
                allowCreate={false}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

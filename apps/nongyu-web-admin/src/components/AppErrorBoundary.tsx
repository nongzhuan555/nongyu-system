import type { ReactNode } from "react";
import { Component } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** 避免运行时异常只剩白屏，便于线上排查 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "sans-serif",
            background: "#f6f8f7",
            color: "#1f2937",
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: 18, marginBottom: 8 }}>管理台加载失败</h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
              {this.state.error.message || "未知错误"}
            </p>
            <button
              type="button"
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 8,
                border: "1px solid #cfe3da",
                background: "#fff",
                cursor: "pointer",
              }}
              onClick={() => window.location.reload()}
            >
              刷新重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

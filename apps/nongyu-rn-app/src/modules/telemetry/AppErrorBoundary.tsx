import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { createThemedStyles } from "@/theme/createThemedStyles";
import { crashPropsFromUnknown, reportCrash } from "./reportCrash";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

/**
 * 根 Error Boundary：捕获渲染期错误 → crash/react → 降级「重试」
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const props = crashPropsFromUnknown(error);
    reportCrash("react", {
      ...props,
      component_stack: typeof info.componentStack === "string" ? info.componentStack : undefined,
    });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <CrashFallback onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

type CrashFallbackProps = {
  onRetry: () => void;
};

/**
 * 全屏降级态（Spec §4.6.1）
 */
function CrashFallback({ onRetry }: CrashFallbackProps) {
  const styles = useStyles();
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Text style={styles.title}>出了点问题</Text>
      <Text style={styles.message}>页面渲染出错，可以重试一次</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="重试"
        onPress={onRetry}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <Text style={styles.btnText}>重试</Text>
      </Pressable>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.space.lg,
    backgroundColor: t.color.background,
    gap: t.space.sm,
  },
  title: {
    fontSize: t.fontSize.lg,
    fontWeight: "700",
    color: t.color.text,
  },
  message: {
    fontSize: t.fontSize.md,
    color: t.color.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  btn: {
    marginTop: t.space.sm,
    backgroundColor: t.color.brand,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm + 2,
    borderRadius: t.radius.md,
  },
  pressed: {
    opacity: 0.8,
  },
  btnText: {
    color: t.color.onBrand,
    fontWeight: "600",
    fontSize: t.fontSize.md,
  },
}));

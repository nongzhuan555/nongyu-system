import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ComponentType, type ReactNode, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { type StyleProp, StyleSheet, type ViewStyle } from "react-native";
import { AppToastHost } from "@/components/ui/toast";
import { AppConfirmHost } from "@/components/ui/confirm";
import { PushyUpdateProvider } from "@/modules/update";
import { ThemeProvider } from "@/theme/ThemeProvider";

type AppProvidersProps = {
  children: ReactNode;
};

/** RN 类型与 React 19 偶发不兼容，显式声明 children */
const GestureRoot = GestureHandlerRootView as ComponentType<{
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}>;

const SheetProvider = BottomSheetModalProvider as ComponentType<{
  children?: ReactNode;
}>;

/**
 * 全局 Provider 栈：Pushy 热更、手势、安全区、主题、React Query、BottomSheet、Toast、确认框
 */
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <PushyUpdateProvider>
      <GestureRoot style={styles.root}>
        <SafeAreaProvider>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <SheetProvider>
                {children}
                <AppToastHost />
                <AppConfirmHost />
              </SheetProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureRoot>
    </PushyUpdateProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

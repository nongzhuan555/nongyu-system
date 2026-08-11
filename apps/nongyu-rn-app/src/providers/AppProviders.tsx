import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ComponentType, type ReactNode, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { type StyleProp, StyleSheet, type ViewStyle } from "react-native";

type AppProvidersProps = {
  children: ReactNode;
};

/** RN 类型与 React 19 偶发不兼容，显式声明 children */
const GestureRoot = GestureHandlerRootView as ComponentType<{
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}>;

/**
 * 全局 Provider 栈：手势、安全区、React Query、Toast
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
    <GestureRoot style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toast />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureRoot>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

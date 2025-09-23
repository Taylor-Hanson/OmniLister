import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { migrate } from "@/src/db/client";
import { useAuthStore } from "@/src/state/useAuthStore";

const qc = new QueryClient();

export default function Layout() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Initialize database
    migrate();
    
    // Initialize auth
    initialize();
  }, [initialize]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={qc}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="sales/import-csv" options={{ presentation: 'modal' }} />
            <Stack.Screen name="sales/detail/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="invoices/detail/[id]" options={{ presentation: 'modal' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

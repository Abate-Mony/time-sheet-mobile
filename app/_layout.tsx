import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from "../context/AuthContext";
export const unstable_settings = {
  anchor: '(tabs)',
};

// Auth state resolves asynchronously (a SecureStore read), so keep the
// native splash screen up until it does instead of flashing a blank screen.
SplashScreen.preventAutoHideAsync();

function SplashScreenController() {
  const { loading } = useAuth();

  if (!loading) {
    SplashScreen.hide();
  }

  return null;
}

function RootNavigator() {
  const { accessToken, loading } = useAuth();
  const colorScheme = useColorScheme();

  if (loading) {
    return null;
  }

  const authenticated = !!accessToken;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Protected guard={!authenticated}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={authenticated}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="job/[id]" options={{ title: 'Job Details' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
            </QueryClientProvider>
    </ThemeProvider>
  );
}
export default function RootLayout() {
  return (
    <AuthProvider>
      <SplashScreenController />
      <RootNavigator />
      <Toast />
    </AuthProvider>
  );
}
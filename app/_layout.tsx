import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, SplashScreen, Stack, ThemeProvider, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from "../context/AuthContext";
import { subscribeToNotificationTaps } from "../utils/pushNotifications";
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

// Deep-links a tapped push notification to the job it's about — payloads
// carry the same web-style `url` (e.g. "/worker/jobs/<id>") the browser
// Web Push notifications use, so this just extracts the id from it.
function NotificationTapHandler() {
  const router = useRouter();

  useEffect(() => {
    return subscribeToNotificationTaps(data => {
      const url = data?.url as string | undefined;
      const jobId = url?.match(/\/worker\/jobs\/([^/?#]+)/)?.[1];

      if (jobId) {
        router.push({ pathname: "/jobs/[id]", params: { id: jobId } });
      } else {
        router.push("/(tabs)/jobs");
      }
    });
  }, [router]);

  return null;
}

function RootNavigator() {
  const { accessToken, loading } = useAuth();

  if (loading) {
    return null;
  }

  const authenticated = !!accessToken;

  return (
    // The app is designed for a light UI only (see the StatusBar note below),
    // so the navigation theme is pinned to DefaultTheme regardless of the
    // OS color scheme — DarkTheme's black background was showing through
    // in the safe-area strip below the tab bar when the device was in dark mode.
    <ThemeProvider value={DefaultTheme}>
          <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Protected guard={!authenticated}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={authenticated}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack.Protected>
      </Stack>
      {authenticated && <NotificationTapHandler />}
      {/* Every screen in this app sits on a light background (#F8FAFC/white)
          right at the top edge, so the status bar needs dark icons for
          contrast regardless of the OS theme — "auto" would pick white
          icons in dark mode, which vanish against that light background. */}
      <StatusBar style="dark" />
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
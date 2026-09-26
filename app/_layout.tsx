import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/queryClient';
import { focusManager, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { activeWorkerJob } from './(tabs)/clock';
import { AuthProvider, useAuth } from "../context/AuthContext";
import {
  reconcileActiveJobNotification,
  updateActiveJobNotification,
  type ActiveJobNotificationJob,
} from "../services/activeJobNotification";
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
// React Query's focus-refetch machinery is a web concept by default
// ("window" blur/focus) — on React Native nothing ever calls it, so every
// query just sits on whatever it fetched once and never refreshes on its
// own. This is TanStack Query's own documented React Native recipe: forward
// app-foreground/background transitions from AppState into focusManager, so
// "the app came back to the foreground" starts behaving like "the tab
// regained focus" does on web, and stale queries refetch automatically
// instead of requiring a full logout/login (which just happens to rebuild
// every query from scratch) to see fresh data.
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== "web") {
    focusManager.setFocused(status === "active");
  }
}

function AppStateFocusManager() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => subscription.remove();
  }, []);

  return null;
}

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

// Keeps the Android "active job" ongoing notification (services/activeJobNotification.ts)
// in sync with the backend — the single source of truth for whether a shift
// is actually in-progress. Reuses the same ["active-job"] query the clock
// tab already owns (React Query dedupes by key, so this doesn't add a
// second network subscription — it's just another consumer of the same
// cached result), so it reacts to every place that query already
// gets invalidated: clock-in, clock-out, cancellation, focus, app resume.
function ActiveJobNotificationManager() {
  const { data } = useQuery(activeWorkerJob());
  const job = (data && "job" in data ? data.job : null) as ActiveJobNotificationJob | null;
  const isInProgress = job?.workerJobDetails?.status === "in-progress";

  useEffect(() => {
    reconcileActiveJobNotification(job);
  }, [job]);

  // Elapsed time itself ticks via the native chronometer (no JS timer
  // needed for that), but the progress percentage/overtime text is computed
  // in JS from cached data, so it needs an occasional nudge to stay
  // current — 45s matches the "30-60s" cadence called for, and re-renders
  // the notification from already-cached data rather than hitting the
  // network.
  useEffect(() => {
    if (!isInProgress || !job) return;
    const id = setInterval(() => updateActiveJobNotification(job), 45_000);
    return () => clearInterval(id);
  }, [isInProgress, job]);

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
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack.Protected>
      </Stack>
      <AppStateFocusManager />
      {authenticated && <NotificationTapHandler />}
      {authenticated && Platform.OS === "android" && <ActiveJobNotificationManager />}
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
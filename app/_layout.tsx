import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/queryClient';
import { focusManager, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider, useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Platform, Pressable, StyleSheet, Text, View, type AppStateStatus } from 'react-native';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from "../context/AuthContext";
import {
  reconcileActiveJobNotification,
  updateActiveJobNotification,
  type ActiveJobNotificationJob,
} from "../services/activeJobNotification";
import { authenticateToUnlock, isAppLockEnabled } from "../services/appLock";
import { reconcileShiftEndAlert } from "../services/shiftEndAlert";
import { syncOfflineClockQueue } from "../utils/offlineClockSync";
import { subscribeToNotificationTaps } from "../utils/pushNotifications";
import { activeWorkerJob } from './(tabs)/clock';
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

// Retries any queued offline clock-in/out (utils/offlineClockQueue.ts) on
// app launch and every time the app returns to the foreground — the two
// moments most likely to mean "signal is back". Gated on `authenticated`
// (not just mounted unconditionally like AppStateFocusManager) because a
// sync attempt while logged out would 401, which reads identically to a
// real server rejection and would wrongly discard the queued action.
function OfflineSyncManager() {
  useEffect(() => {
    syncOfflineClockQueue();

    const subscription = AppState.addEventListener("change", status => {
      if (status === "active") syncOfflineClockQueue();
    });
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

// Shift End Alert (services/shiftEndAlert.ts) — cross-platform (unlike
// ActiveJobNotificationManager above, which is Android-only since it drives
// a custom native progress notification), so it's its own component rather
// than folded into that one. Shares the same ["active-job"] query, so this
// adds no extra network subscription — just another consumer of the same
// cached result reacting to the same clock-in/out/cancellation/focus events.
function ShiftEndAlertManager() {
  const { data } = useQuery(activeWorkerJob());
  const job = (data && "job" in data ? data.job : null) as ActiveJobNotificationJob | null;

  useEffect(() => {
    reconcileShiftEndAlert(job);
  }, [job]);

  return null;
}

// Checks the app-lock preference (services/appLock.ts) before anything
// renders, and re-locks on every return to the foreground — standard
// "lock on backgrounding" behavior. `ready` gates RootNavigator's render
// entirely (see below) so the Stack's real screens never paint even for a
// frame before we know whether to show them behind the lock overlay —
// the point of the feature would be undermined by a flash of content.
function useAppLockGate(authenticated: boolean) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      setLocked(false);
      setReady(true);
      return;
    }

    let mounted = true;
    isAppLockEnabled().then(enabled => {
      if (!mounted) return;
      setLocked(enabled);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;

    // Only re-lock when actually returning from the background (home
    // button / app switcher) — authenticateAsync's own Face ID/passcode
    // system sheet transiently takes the app through "inactive" as it
    // shows, which also fires an "active" transition once it dismisses.
    // Re-locking on every "active" event (not just background -> active)
    // meant a *successful* unlock immediately re-triggered this same
    // listener and locked it straight back.
    let previousState = AppState.currentState;

    const subscription = AppState.addEventListener("change", async status => {
      const previous = previousState;
      previousState = status;

      if (previous !== "background" || status !== "active") return;

      const enabled = await isAppLockEnabled();
      if (enabled) setLocked(true);
    });
    return () => subscription.remove();
  }, [authenticated]);

  return { ready, locked, setLocked };
}

function AppLockOverlay({
  locked,
  onUnlocked,
}: {
  locked: boolean;
  onUnlocked: () => void;
}) {
  const [checking, setChecking] = useState(false);

  const attemptUnlock = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    const success = await authenticateToUnlock();
    setChecking(false);
    if (success) onUnlocked();
  }, [checking, onUnlocked]);

  // Prompt immediately as soon as the screen appears locked, rather than
  // making the worker tap a button first every single time.
  useEffect(() => {
    if (locked) attemptUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  // A plain absolutely-positioned sibling View doesn't reliably sit above
  // expo-router's <Stack> on iOS — react-native-screens renders each screen
  // as a native UIViewController there, and zIndex only governs RN's own
  // view flattening, not native view-controller layering (Android's stack
  // implementation happened to still show it, which is why this only
  // surfaced on iOS). A Modal always renders in its own native layer above
  // everything on both platforms, which is what this actually needs.
  return (
    <Modal visible={locked} animationType="none" statusBarTranslucent presentationStyle="fullScreen">
      <View style={lockStyles.overlay}>
        <View style={lockStyles.iconCircle}>
          <Lock size={26} color="#1E3A5F" />
        </View>
        <Text style={lockStyles.title}>INPRN Locked</Text>
        <Text style={lockStyles.subtitle}>Unlock to see your shifts and clock in.</Text>
        <Pressable style={lockStyles.button} onPress={attemptUnlock} disabled={checking}>
          {checking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={lockStyles.buttonText}>Unlock</Text>}
        </Pressable>
      </View>
    </Modal>
  );
}

const lockStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8EEF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 16 },
  button: {
    height: 46,
    minWidth: 140,
    borderRadius: 12,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});

function RootNavigator() {
  const { accessToken, loading } = useAuth();
  const colorScheme = useColorScheme();
  const authenticated = !!accessToken;
  const lockGate = useAppLockGate(authenticated);

  if (loading || !lockGate.ready) {
    return null;
  }

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
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          {/* Universal/App Links land in app/worker/ — see that folder's
              comment. Learned the hard way with "settings" above: a
              top-level route file with no explicit Stack.Screen entry here
              is unreachable even though the file exists. */}
          <Stack.Screen name="worker" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <AppStateFocusManager />
      {authenticated && <NotificationTapHandler />}
      {authenticated && <OfflineSyncManager />}
      {authenticated && Platform.OS === "android" && <ActiveJobNotificationManager />}
      {authenticated && <ShiftEndAlertManager />}
      {authenticated && (
        <AppLockOverlay locked={lockGate.locked} onUnlocked={() => lockGate.setLocked(false)} />
      )}
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
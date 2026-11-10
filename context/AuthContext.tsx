import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import { router } from "expo-router";
import { AppState } from "react-native";
import Toast from "react-native-toast-message";
import { queryClient } from "../lib/queryClient";
import { clearPersistedQueries } from "../lib/queryPersistence";
import { prefetchAfterLogin } from "../utils/prefetchAfterLogin";
import { stopActiveJobNotification } from "../services/activeJobNotification";
import { cancelAnyPendingShiftEndAlert } from "../services/shiftEndAlert";
import { clearSession, getStoredUser, getToken, saveRefreshToken, saveSession, saveUser } from "../utils/auth";
import customFetch from "../utils/customFetch";
import { setUnauthorizedHandler } from "../utils/authEvents";
import { registerPushTokenWithServer } from "../utils/pushNotifications";
import type { User } from "../utils/types";

type AuthContextType = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (
    accessToken: string,
    refreshToken: string,
    user: User
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  async function loadSession() {
    try {
      const token = await getToken();
      const storedUser = await getStoredUser();

      if (token && storedUser) {
        setAccessToken(token);
        setUser(storedUser);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (accessToken) {
      registerPushTokenWithServer();
    }
  }, [accessToken]);

  // Shift times are read in the company's timezone (hooks/shiftgate.ts), but
  // the login response is the only place the app used to learn it — so a
  // timezone changed in the web dashboard's Settings never reached a phone
  // until the worker logged out and back in. Re-check it whenever the app
  // opens or returns to the foreground. Failures are ignored (offline, etc.):
  // the saved value keeps working until the next successful check.
  useEffect(() => {
    if (!accessToken) return;

    const syncCompanyTimezone = async () => {
      try {
        const { data } = await customFetch.get<{ user: { companyTimezone?: string } }>("/users/current-user");
        const latest = data.user?.companyTimezone;
        if (!latest) return;
        setUser(current => {
          if (!current || current.companyTimezone === latest) return current;
          const next = { ...current, companyTimezone: latest };
          saveUser(next);
          return next;
        });
      } catch {
        // Keep the saved timezone; try again next time the app is opened.
      }
    };

    syncCompanyTimezone();
    const subscription = AppState.addEventListener("change", status => {
      if (status === "active") syncCompanyTimezone();
    });
    return () => subscription.remove();
  }, [accessToken]);

  async function login(
    token: string,
    refreshToken: string,
    user: User
  ) {
    await saveSession(token, user);
    await saveRefreshToken(refreshToken);

    setAccessToken(token);
    setUser(user);

    // Grab the key screens' data now, while there's signal, so it's saved
    // for offline use from the very first session. Not awaited — login
    // shouldn't wait on it.
    prefetchAfterLogin();
  }

  async function logout() {
    await clearSession();

    // The active-job notification manager only reconciles while
    // authenticated (app/_layout.tsx unmounts it on logout), so it can no
    // longer converge a stale "Job in progress" notification away on its
    // own if the worker logs out mid-shift — clear it explicitly here
    // instead of leaving it stuck.
    await stopActiveJobNotification();
    await cancelAnyPendingShiftEndAlert();

    // Drop every cached response from this account (jobs, stats, earnings,
    // failed queries…) so the next sign-in — possibly a different worker —
    // never sees it: both the in-memory cache and the offline copy on disk.
    queryClient.clear();
    await clearPersistedQueries();

    setAccessToken(null);
    setUser(null);
  }

  // Merges a partial update (e.g. from the edit-profile form) into the
  // cached user so the UI reflects it immediately, without a re-login.
  async function updateUser(patch: Partial<User>) {
    setUser(current => {
      if (!current) return current;
      const next = { ...current, ...patch };
      saveUser(next);
      return next;
    });
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      Toast.show({ type: "error", text1: "Session expired", text2: "Please log in again." });
      logout().then(() => router.replace("/login"));
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
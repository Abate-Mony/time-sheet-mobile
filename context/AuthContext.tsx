import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { clearSession, getStoredUser, getToken, saveSession, saveUser } from "../utils/auth";
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

  async function login(
    token: string,
    refreshToken: string,
    user: User
  ) {
    await saveSession(token, user);
    await SecureStore.setItemAsync("refreshToken", refreshToken);

    setAccessToken(token);
    setUser(user);
  }

  async function logout() {
    await clearSession();
    await SecureStore.deleteItemAsync("refreshToken");

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
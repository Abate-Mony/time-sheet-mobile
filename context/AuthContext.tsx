import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import * as SecureStore from "expo-secure-store";
import { clearSession, getStoredUser, getToken, saveSession } from "../utils/auth";
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

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        logout,
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
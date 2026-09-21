import * as SecureStore from "expo-secure-store"
import type { User } from "./types"

const TOKEN_KEY = "accessToken"
const REFRESH_TOKEN_KEY = "refreshToken"
const USER_KEY = "user"

export const saveSession = async (accessToken: string, user: User) => {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken)
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
}

export const saveUser = (user: User) => SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY)

// The access token is short-lived by design (15 min) — this is what lets a
// session actually last, exchanged for a fresh access token by customFetch's
// response interceptor whenever a request comes back 401. Rotated on every
// use (see POST /auth/refresh), so the stored value always changes together
// with the access token.
export const saveAccessAndRefreshTokens = async (accessToken: string, refreshToken: string) => {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken)
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
}

export const saveRefreshToken = (refreshToken: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)

export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY)

export const getStoredUser = async (): Promise<User | null> => {
  const raw = await SecureStore.getItemAsync(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export const clearSession = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
  await SecureStore.deleteItemAsync(USER_KEY)
}
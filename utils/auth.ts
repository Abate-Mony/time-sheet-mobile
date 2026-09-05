import * as SecureStore from "expo-secure-store"
import type { User } from "./types"

const TOKEN_KEY = "accessToken"
const USER_KEY = "user"

export const saveSession = async (accessToken: string, user: User) => {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken)
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
}

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY)

export const getStoredUser = async (): Promise<User | null> => {
  const raw = await SecureStore.getItemAsync(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export const clearSession = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(USER_KEY)
}
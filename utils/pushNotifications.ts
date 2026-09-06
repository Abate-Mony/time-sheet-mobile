import Constants from "expo-constants"
import { Platform } from "react-native"
import customFetch from "./customFetch"

// expo-notifications' Android remote-push code throws as soon as the module
// is evaluated under Expo Go (unsupported there since SDK 53 — see
// https://docs.expo.dev/versions/latest/sdk/notifications/). A static
// top-level `import` would crash the whole app in Expo Go regardless of
// whether any of it actually runs, so it's required lazily instead, and
// only outside Expo Go.
const isExpoGo = Constants.appOwnership === "expo"

type NotificationsModule = typeof import("expo-notifications")

let cached: NotificationsModule | null = null

function getNotifications(): NotificationsModule | null {
  if (isExpoGo) return null

  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("expo-notifications") as NotificationsModule
    cached.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
  }

  return cached
}

async function getExpoPushToken(): Promise<string | null> {
  const Notifications = getNotifications()
  if (!Notifications) return null

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== "granted") return null

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  if (!projectId) {
    console.warn("No EAS projectId configured (run `eas init`) — skipping push registration.")
    return null
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    return token
  } catch (err) {
    console.warn("Failed to get Expo push token:", err)
    return null
  }
}

export async function registerPushTokenWithServer(): Promise<void> {
  const token = await getExpoPushToken()
  if (!token) return

  try {
    await customFetch.post("/workers/expo-push-token", { token })
  } catch (err) {
    console.warn("Failed to register push token with server:", err)
  }
}

// Subscribes to a tapped notification's data payload; no-ops (and returns a
// no-op unsubscribe) under Expo Go, where remote push isn't available.
export function subscribeToNotificationTaps(
  onTap: (data: Record<string, unknown> | undefined) => void
): () => void {
  const Notifications = getNotifications()
  if (!Notifications) return () => {}

  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    onTap(response.notification.request.content.data)
  })

  return () => sub.remove()
}

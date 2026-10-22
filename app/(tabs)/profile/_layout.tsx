import { Stack } from "expo-router"

// The main Profile screen is always the bottom of this stack, even when an
// inner screen (e.g. Earnings) is opened from another tab with `withAnchor`
// — so the Profile tab icon can always pop back to it.
export const unstable_settings = {
  anchor: "index",
}

export default function ProfileStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="download-time-sheet" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="time-off" />
      <Stack.Screen name="contactmanager" />
      <Stack.Screen name="help" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="availability" />
      <Stack.Screen name="work-hub" />
      <Stack.Screen name="team" />
      <Stack.Screen name="locations" />
    </Stack>
  )
}

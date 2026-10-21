import { Stack } from "expo-router"

// The all-jobs list is always the bottom of this stack, even when a job is
// opened from another tab (see utils/openJob.ts) — so the Jobs tab icon can
// always pop back to it.
export const unstable_settings = {
  anchor: "index",
}

export default function JobsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="open-shifts" />
      <Stack.Screen name="recurring" />
      <Stack.Screen name="open-shifts-details" />
      <Stack.Screen name="my-claims" />
    </Stack>
  )
}

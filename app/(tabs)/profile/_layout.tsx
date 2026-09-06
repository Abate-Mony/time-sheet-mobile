import { Stack } from "expo-router"

export default function JobsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="download-time-sheet" />
    </Stack>
  )
}

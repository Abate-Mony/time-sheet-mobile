import { Stack } from "expo-router"

export default function JobsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="open-shifts" />
      <Stack.Screen name="recurring" />
    </Stack>
  )
}

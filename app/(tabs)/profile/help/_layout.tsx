import { Stack } from "expo-router"

export default function HelpStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[slug]" />
    </Stack>
  )
}

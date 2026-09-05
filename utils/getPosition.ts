import * as Location from "expo-location"

export async function getCurrentPosition(): Promise<{
  lat: number
  lng: number
  accuracy: number | null
} | null> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== "granted") return null

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
    }
  } catch {
    // Location services off, or a timeout — clock in anyway, unflagged
    return null
  }
}

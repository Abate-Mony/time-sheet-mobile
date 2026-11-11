import * as Location from "expo-location"

// How long clock in/out waits for a fresh GPS fix. Without mobile data or
// Wi-Fi the phone can't use network-assisted location, and a cold GPS fix
// (especially indoors) can take minutes — long enough that the worker
// thinks clocking in is broken. After this, use the last known position.
const FRESH_FIX_TIMEOUT_MS = 8_000
// A last known position older than this is too stale to say where the
// worker is now; clock in without one instead.
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000

type Position = { lat: number; lng: number; accuracy: number | null }

const toPosition = (location: Location.LocationObject): Position => ({
  lat: location.coords.latitude,
  lng: location.coords.longitude,
  accuracy: location.coords.accuracy,
})

export async function getCurrentPosition(): Promise<Position | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") return null

    const fresh = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), FRESH_FIX_TIMEOUT_MS)),
    ])
    if (fresh) return toPosition(fresh)

    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })
    return lastKnown ? toPosition(lastKnown) : null
  } catch {
    // Location services off, or a timeout — clock in anyway, unflagged
    return null
  }
}

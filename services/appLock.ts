import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

// Optional biometric/PIN lock — this app holds GPS location history and
// payroll data, worth protecting if the phone is shared or left unlocked.
// Local-only (SecureStore), same as the other device-level toggles here —
// nothing about "is app lock on" needs to sync to the backend.
const PREFERENCE_KEY = "appLockEnabled";

export async function isAppLockEnabled(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PREFERENCE_KEY);
  console.log("[AppLock] isAppLockEnabled() read:", JSON.stringify(stored));
  return stored === "1"; // unset (first run) defaults to OFF — opt-in
}

async function setAppLockEnabled(enabled: boolean): Promise<void> {
  console.log("[AppLock] setAppLockEnabled() writing:", enabled);
  await SecureStore.setItemAsync(PREFERENCE_KEY, enabled ? "1" : "0");
}

export type AppLockAvailability = "available" | "no_hardware" | "not_enrolled";

export async function checkAppLockAvailability(): Promise<AppLockAvailability> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  console.log("[AppLock] hasHardwareAsync():", hasHardware);
  if (!hasHardware) return "no_hardware";

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  console.log("[AppLock] isEnrolledAsync():", isEnrolled);
  if (!isEnrolled) return "not_enrolled";

  return "available";
}

// Verifies the device can actually authenticate before committing to the
// setting — turning this on without ever confirming it works would risk
// locking someone out of a payroll/scheduling app with no way back in.
// Returns why it failed so the settings screen can show a specific message
// instead of a generic "couldn't enable".
export async function enableAppLock(): Promise<
  { success: true } | { success: false; reason: AppLockAvailability | "auth_failed" }
> {
  const availability = await checkAppLockAvailability();
  console.log("[AppLock] enableAppLock() availability:", availability);
  if (availability !== "available") return { success: false, reason: availability };

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Confirm to turn on App Lock",
    // Default (false) — let a failed biometric attempt fall back to the
    // device passcode/PIN, same as any other biometric-gated app.
    disableDeviceFallback: false,
  });
  console.log("[AppLock] enableAppLock() authenticateAsync result:", JSON.stringify(result));

  if (!result.success) return { success: false, reason: "auth_failed" };

  await setAppLockEnabled(true);
  return { success: true };
}

export async function disableAppLock(): Promise<void> {
  await setAppLockEnabled(false);
}

export async function authenticateToUnlock(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock INPRN",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch (err) {
    console.warn("App lock authentication failed:", err);
    return false;
  }
}

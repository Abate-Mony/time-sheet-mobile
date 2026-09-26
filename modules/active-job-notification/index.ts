import Constants from "expo-constants";
import { Platform } from "react-native";

export interface ShowActiveJobNotificationParams {
  jobId: string;
  assignmentId?: string;
  title: string;
  subtitle?: string;
  timingLine?: string;
  // Epoch ms — native uses this for a real system chronometer instead of a
  // JS setInterval ticking every second.
  checkedInAtMs?: number;
  // 0-100, or omitted entirely when the job has no reliable scheduled
  // duration (native then skips the progress bar rather than faking one).
  percentage?: number | null;
  deepLink?: string;
}

interface ActiveJobNotificationNativeModule {
  show(params: ShowActiveJobNotificationParams): Promise<void>;
  cancel(): Promise<void>;
}

// Custom native code doesn't exist in Expo Go and this module is
// Android-only — mirrors the guard pattern already used in
// utils/pushNotifications.ts for expo-notifications' own Android-only bits.
const isExpoGo = Constants.appOwnership === "expo";
const isSupportedPlatform = Platform.OS === "android" && !isExpoGo;

let nativeModule: ActiveJobNotificationNativeModule | null = null;
if (isSupportedPlatform) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require("expo-modules-core");
    nativeModule = requireNativeModule("ActiveJobNotification");
  } catch (err) {
    console.warn("ActiveJobNotification native module unavailable:", err);
  }
}

export async function showActiveJobNotification(params: ShowActiveJobNotificationParams): Promise<void> {
  if (!nativeModule) return;
  try {
    await nativeModule.show(params);
  } catch (err) {
    console.warn("ActiveJobNotification.show failed:", err);
  }
}

export async function cancelActiveJobNotification(): Promise<void> {
  if (!nativeModule) return;
  try {
    await nativeModule.cancel();
  } catch (err) {
    console.warn("ActiveJobNotification.cancel failed:", err);
  }
}

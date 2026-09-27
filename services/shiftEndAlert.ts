import dayjs from "dayjs";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getNotifications } from "../utils/pushNotifications";
import { computeJobProgress, type ActiveJobNotificationJob } from "./activeJobNotification";

// Optional local reminder: fires once, at the moment a worker's scheduled
// shift duration is reached, so they know to wrap up and clock out — it
// never clocks them out itself, never touches the assignment/job status,
// and never affects worked-hours/overtime calculations, all of which stay
// driven entirely by real clock-in/out events (see workerController.ts).
//
// Reuses computeJobProgress (already the canonical scheduled-duration rule,
// built for the active-job notification) for expectedEndAt, and the same
// lazy-required, Expo-Go-guarded `expo-notifications` module
// (utils/pushNotifications.ts) already used for push — this is a *local*
// scheduled notification (Notifications.scheduleNotificationAsync with a
// DATE trigger), not a server-sent one, so it doesn't touch the backend
// NotificationPreferences system; it's a device-local, off-by-default-off
// (default ON) SecureStore flag instead, surfaced on app/settings.tsx.

const PREFERENCE_KEY = "shiftEndAlertEnabled";
// Tracks which assignment's alert is currently scheduled, so reconcile can
// tell "nothing changed" apart from "the active job changed" or "there's no
// longer an active job" without needing a full local notification list scan.
const LAST_SCHEDULED_KEY = "shiftEndAlertAssignmentId";
const CHANNEL_ID = "shift_reminders";

export async function isShiftEndAlertEnabled(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PREFERENCE_KEY);
  return stored !== "0"; // unset (first run) defaults to ON
}

export async function setShiftEndAlertEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(PREFERENCE_KEY, enabled ? "1" : "0");
}

async function ensureChannel(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications || Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Shift reminders",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
  });
}

function identifierFor(assignmentId: string): string {
  // Stable per assignment (not per clockInAt) — an assignment only ever
  // goes through one clock-in/out cycle in this app's lifecycle (completed
  // is terminal), so this is enough to identify "this clock session", and
  // scheduling again with the same identifier safely replaces any existing
  // trigger instead of creating a duplicate.
  return `shift-end-${assignmentId}`;
}

async function cancelById(assignmentId: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(identifierFor(assignmentId));
  } catch (err) {
    console.warn("Failed to cancel shift-end alert:", err);
  }
}

export async function cancelShiftEndAlert(assignmentId: string): Promise<void> {
  await cancelById(assignmentId);

  const last = await SecureStore.getItemAsync(LAST_SCHEDULED_KEY);
  if (last === assignmentId) await SecureStore.deleteItemAsync(LAST_SCHEDULED_KEY);
}

// Logout doesn't have the active job in scope the way reconcile does —
// mirrors stopActiveJobNotification's use in AuthContext.logout(), so a
// worker who logs out mid-shift doesn't leave a stale alert armed for
// whoever's logged in on this device next.
export async function cancelAnyPendingShiftEndAlert(): Promise<void> {
  const last = await SecureStore.getItemAsync(LAST_SCHEDULED_KEY);
  if (last) await cancelShiftEndAlert(last);
}

async function scheduleFor(job: ActiveJobNotificationJob, expectedEndAt: Date): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  // Permission is already requested at login (registerPushTokenWithServer
  // in pushNotifications.ts) — this only checks current status rather than
  // prompting again, per "don't prompt every time worker clocks in".
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  await ensureChannel();

  const assignmentId = job.workerJobDetails._id;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: identifierFor(assignmentId),
      content: {
        title: "Scheduled shift time reached",
        body: `Your scheduled time for ${job.title} has ended. Clock out when you've finished.`,
        sound: "default",
        // Same `url` shape the server's push payloads already use — reuses
        // NotificationTapHandler (app/_layout.tsx) as-is, no new routing.
        // Job detail already has a "Job Live" shortcut into the clock
        // screen when in-progress, so this lands the worker one tap away.
        data: { url: `/worker/jobs/${job._id}` },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: expectedEndAt,
        channelId: CHANNEL_ID,
      },
    });

    await SecureStore.setItemAsync(LAST_SCHEDULED_KEY, assignmentId);
  } catch (err) {
    // A reminder failing to schedule must never surface as an error to the
    // worker — clock-in already succeeded and remains the source of truth.
    console.warn("Failed to schedule shift-end alert:", err);
  }
}

// The single entry point — safe to call on every active-job query change
// (clock-in, clock-out, cancellation, focus, app resume, preference
// toggle), same pattern as reconcileActiveJobNotification. Always
// re-derives the correct state from scratch rather than diffing, so it's
// idempotent no matter how often or in what order it fires.
export async function reconcileShiftEndAlert(job: ActiveJobNotificationJob | null): Promise<void> {
  const lastAssignmentId = await SecureStore.getItemAsync(LAST_SCHEDULED_KEY);

  const isActive = !!job && job.workerJobDetails?.status === "in-progress" && !!job.workerJobDetails.checkedInAt;
  const currentAssignmentId = isActive ? job!.workerJobDetails._id : null;

  // The previously-scheduled alert belongs to a different (or no longer
  // active) assignment — clock-out, cancellation, or a new shift started.
  if (lastAssignmentId && lastAssignmentId !== currentAssignmentId) {
    await cancelById(lastAssignmentId);
    await SecureStore.deleteItemAsync(LAST_SCHEDULED_KEY);
  }

  if (!isActive) return;

  const enabled = await isShiftEndAlertEnabled();
  if (!enabled) {
    if (currentAssignmentId) await cancelById(currentAssignmentId);
    return;
  }

  const progress = computeJobProgress({ ...job!, checkedInAt: job!.workerJobDetails.checkedInAt });
  if (!progress.scheduledEndAt) return; // no reliable duration — never schedule a guess

  const expectedEndAt = dayjs(progress.scheduledEndAt);
  // Already past (e.g. preference just turned on mid-overtime, or a
  // reconcile ran late) — don't fire a retroactive alert.
  if (!expectedEndAt.isAfter(dayjs())) return;

  // Reschedule unconditionally when active: cheap (scheduleNotificationAsync
  // with the same identifier just replaces), and it's what naturally
  // re-schedules against a corrected expectedEndAt if the job's schedule
  // changed and this device has refetched the update.
  await scheduleFor(job!, expectedEndAt.toDate());
}

import { isAxiosError } from "axios";
import Toast from "react-native-toast-message";
import { queryClient } from "../lib/queryClient";
import customFetch from "./customFetch";
import { getQueuedActions, removeQueuedAction, type QueuedClockAction } from "./offlineClockQueue";

let isSyncing = false;

async function syncOne(action: QueuedClockAction): Promise<"synced" | "rejected" | "still-offline"> {
  try {
    await customFetch.patch(`/workers/${action.jobId}/status`, {
      status: action.status,
      occurredAt: action.occurredAt,
      ...(action.location && { location: action.location }),
      ...(action.clockOutReason && { clockOutReason: action.clockOutReason }),
      ...(action.clockOutNote && { clockOutNote: action.clockOutNote }),
    });
    return "synced";
  } catch (err) {
    // A response means the server was reached and explicitly rejected this
    // (e.g. the 12-hour "too old to sync" cap, or the shift's status moved
    // on in the meantime) — no point retrying it forever.
    if (isAxiosError(err) && err.response) return "rejected";
    return "still-offline";
  }
}

// Safe to call as often as the app likes — no-ops instantly when the queue
// is empty, and a second call while one is already in flight just returns.
// Processes strictly in order (oldest first) so a job's queued clock-in
// always reaches the server before its clock-out does.
export async function syncOfflineClockQueue(): Promise<void> {
  if (isSyncing) return;

  const queue = await getQueuedActions();
  if (!queue.length) return;

  isSyncing = true;
  let syncedAny = false;

  try {
    for (const action of queue) {
      const result = await syncOne(action);

      if (result === "synced") {
        await removeQueuedAction(action.id);
        syncedAny = true;
        Toast.show({
          type: "success",
          text1: action.status === "in-progress" ? "Clock-in synced" : "Clock-out synced",
          text2: "Saved while you were offline.",
        });
      } else if (result === "rejected") {
        // Remove it either way — retrying a definitive rejection forever
        // would just spam the same error. The worker still has a real
        // record to fall back on: their manager can record the hours
        // manually from what they remember/report.
        await removeQueuedAction(action.id);
        Toast.show({
          type: "error",
          text1: "Couldn't sync an offline clock event",
          text2: "Ask your manager to record those hours manually.",
        });
      } else {
        // Still no connectivity — stop here, leave the rest queued, try
        // again on the next trigger (app foreground, tab focus, etc.).
        break;
      }
    }
  } finally {
    isSyncing = false;
    if (syncedAny) {
      queryClient.invalidateQueries({ queryKey: ["active-job"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["worker-stats"] });
    }
  }
}

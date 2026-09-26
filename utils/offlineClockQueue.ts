import { File, Paths } from "expo-file-system";

// Clock-in/out is the one action a worker needs to take with no signal at
// all (basements, rural sites, warehouses) — this queues it locally instead
// of just failing, and retries once connectivity is back. `occurredAt` is
// captured at the moment the worker actually tapped the button, not when
// the sync eventually succeeds — see the backend's `occurredAt` handling in
// updateWorkerJobStatus (time_sheet_server), which is what makes it safe to
// trust that timestamp for payroll instead of the server-receive time.
export interface QueuedClockAction {
  id: string;
  jobId: string;
  status: "in-progress" | "completed";
  occurredAt: string; // ISO
  location: { lat: number; lng: number; accuracy: number | null } | null;
  clockOutReason?: string;
  clockOutNote?: string;
}

// expo-file-system's newer class-based API (SDK 54+) — File.write()/.textSync()
// are synchronous, unlike the classic FileSystem.readAsStringAsync/writeAsStringAsync
// this replaced.
function queueFile(): File {
  return new File(Paths.document, "offline-clock-queue.json");
}

function readQueueSync(): QueuedClockAction[] {
  try {
    const file = queueFile();
    if (!file.exists) return [];
    const parsed = JSON.parse(file.textSync());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A corrupt/unreadable queue file must never block clocking in/out —
    // treat it as empty rather than throwing.
    return [];
  }
}

function writeQueueSync(queue: QueuedClockAction[]): void {
  try {
    queueFile().write(JSON.stringify(queue));
  } catch (err) {
    console.warn("Failed to persist offline clock queue:", err);
  }
}

export async function enqueueClockAction(action: QueuedClockAction): Promise<void> {
  const queue = readQueueSync();
  queue.push(action);
  writeQueueSync(queue);
}

// FIFO — callers rely on this order so a queued clock-in for a job always
// syncs before that same job's queued clock-out.
export async function getQueuedActions(): Promise<QueuedClockAction[]> {
  return readQueueSync();
}

export async function removeQueuedAction(id: string): Promise<void> {
  const queue = readQueueSync();
  writeQueueSync(queue.filter(a => a.id !== id));
}

export async function hasQueuedActions(): Promise<boolean> {
  return readQueueSync().length > 0;
}

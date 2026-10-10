import Constants from "expo-constants";
import dayjs, { type Dayjs } from "dayjs";
import { Platform } from "react-native";
import type { ActiveJobActivityProps } from "../components/live-activity/ActiveJobActivity";
import { cancelActiveJobNotification, showActiveJobNotification } from "../modules/active-job-notification";

// Narrow structural shape — deliberately not imported from
// app/(tabs)/clock.tsx's WorkerJobWithDetails to avoid coupling this service
// to a screen file. Any WorkerJob-shaped object (from /workers/active-job,
// /workers/:id, etc.) satisfies this by TS's structural typing.
export interface ActiveJobNotificationJob {
  _id: string;
  title: string;
  location?: string | null;
  client?: { name?: string | null } | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  workerJobDetails: {
    _id: string;
    status?: string;
    checkedInAt?: string;
  };
}

export interface ActiveJobProgress {
  elapsedMs: number;
  // null = no reliable scheduled duration — never fabricate a percentage.
  percentage: number | null;
  isOvertime: boolean;
  overtimeMs: number;
  scheduledEndAt: string | null;
}

function resolveScheduledWindow(
  job: Pick<ActiveJobNotificationJob, "date" | "startTime" | "endTime">
): { start: Dayjs; end: Dayjs } | null {
  if (!job.startTime || !job.endTime) return null;

  const anchorDate = job.date ? dayjs(job.date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD");
  const start = dayjs(`${anchorDate} ${job.startTime}`);
  let end = dayjs(`${anchorDate} ${job.endTime}`);
  if (!start.isValid() || !end.isValid()) return null;

  // Overnight shift — end time is technically "earlier" than start on the
  // same calendar date, so it must be the next day.
  if (end.isBefore(start)) end = end.add(1, "day");

  return { start, end };
}

// Pure — exported for unit testing once this project has a test runner (it
// currently doesn't; see the completion report).
export function computeJobProgress(
  job: Pick<ActiveJobNotificationJob, "date" | "startTime" | "endTime"> & { checkedInAt?: string },
  now: Dayjs = dayjs()
): ActiveJobProgress {
  const checkedIn = job.checkedInAt ? dayjs(job.checkedInAt) : now;
  const elapsedMs = Math.max(now.diff(checkedIn), 0);

  const window = resolveScheduledWindow(job);
  if (!window) {
    return { elapsedMs, percentage: null, isOvertime: false, overtimeMs: 0, scheduledEndAt: null };
  }

  const durationMs = window.end.diff(window.start);
  if (durationMs <= 0) {
    return { elapsedMs, percentage: null, isOvertime: false, overtimeMs: 0, scheduledEndAt: window.end.toISOString() };
  }

  const percentage = Math.min(Math.max(Math.floor((elapsedMs / durationMs) * 100), 0), 100);
  const isOvertime = now.isAfter(window.end);
  const overtimeMs = isOvertime ? now.diff(window.end) : 0;

  return { elapsedMs, percentage, isOvertime, overtimeMs, scheduledEndAt: window.end.toISOString() };
}

function formatDurationShort(ms: number): { h: number; m: number } {
  const totalMinutes = Math.max(Math.floor(ms / 60000), 0);
  return { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60 };
}

function formatTimingLine(job: ActiveJobNotificationJob, progress: ActiveJobProgress): string {
  const { h, m } = formatDurationShort(progress.elapsedMs);
  const elapsed = h > 0 ? `${h}h ${m}m elapsed` : `${m}m elapsed`;

  if (progress.scheduledEndAt == null) {
    const startedAt = job.workerJobDetails.checkedInAt ? dayjs(job.workerJobDetails.checkedInAt).format("HH:mm") : null;
    return startedAt ? `${elapsed} · Started ${startedAt}` : elapsed;
  }

  if (progress.isOvertime) {
    const overtime = formatDurationShort(progress.overtimeMs);
    const overtimeLabel = overtime.h > 0 ? `${overtime.h}h ${overtime.m}m overtime` : `${overtime.m}m overtime`;
    return `${elapsed} · ${overtimeLabel}`;
  }

  return `${elapsed} · Ends ${dayjs(progress.scheduledEndAt).format("HH:mm")}`;
}

function subtitleFor(job: ActiveJobNotificationJob): string {
  const client = job.client?.name;
  const location = job.location;
  if (client && location) return `${client} · ${location}`;
  return client || location || job.title;
}

// ── iOS: Live Activity ───────────────────────────────────────────────────────
// Same job state as the Android notification, rendered by
// components/live-activity/ActiveJobActivity.tsx. Required lazily so Android
// and Expo Go (no expo-widgets native module) never load it.

type ActiveJobActivityFactory = typeof import("../components/live-activity/ActiveJobActivity").default;

let liveActivityFactory: ActiveJobActivityFactory | null | undefined;
function getLiveActivityFactory(): ActiveJobActivityFactory | null {
  if (liveActivityFactory !== undefined) return liveActivityFactory;
  liveActivityFactory = null;
  if (Platform.OS !== "ios" || Constants.appOwnership === "expo") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    liveActivityFactory = require("../components/live-activity/ActiveJobActivity").default;
  } catch (err) {
    console.warn("Live Activity unavailable:", err);
  }
  return liveActivityFactory ?? null;
}

function liveActivityPropsFor(job: ActiveJobNotificationJob): ActiveJobActivityProps {
  const checkedInAt = job.workerJobDetails.checkedInAt;
  const checkedInAtMs = checkedInAt ? dayjs(checkedInAt).valueOf() : Date.now();
  const progress = computeJobProgress({ ...job, checkedInAt });
  const window = resolveScheduledWindow(job);
  const durationMs = window ? window.end.diff(window.start) : 0;

  return {
    title: job.title,
    subtitle: subtitleFor(job),
    checkedInAtMs,
    progressEndAtMs: durationMs > 0 ? checkedInAtMs + durationMs : null,
    scheduledEndAtMs: progress.scheduledEndAt ? dayjs(progress.scheduledEndAt).valueOf() : null,
    isOvertime: progress.isOvertime,
  };
}

// Last props pushed to the activity — iOS rations Live Activity updates, so
// the 45s refresh in _layout.tsx only sends one when something changed
// (in practice: going into overtime). The timer and progress bar tick
// natively and never need an update.
let lastLiveActivityProps: string | null = null;

async function showLiveActivity(job: ActiveJobNotificationJob): Promise<void> {
  const factory = getLiveActivityFactory();
  if (!factory) return;
  try {
    const props = liveActivityPropsFor(job);
    const serialized = JSON.stringify(props);
    // Instances survive app restarts, so recover rather than assume — and
    // never leave more than one running.
    const [current, ...extras] = factory.getInstances();
    await Promise.all(extras.map(a => a.end("immediate")));

    if (!current) {
      factory.start(props, "onclockly://clock");
    } else if (serialized !== lastLiveActivityProps) {
      await current.update(props);
    }
    lastLiveActivityProps = serialized;
  } catch (err) {
    console.warn("Live Activity start/update failed:", err);
  }
}

async function endLiveActivity(): Promise<void> {
  const factory = getLiveActivityFactory();
  if (!factory) return;
  lastLiveActivityProps = null;
  try {
    await Promise.all(factory.getInstances().map(a => a.end("immediate")));
  } catch (err) {
    console.warn("Live Activity end failed:", err);
  }
}

// start/update are the same operation — Android's notify() with a stable ID
// always updates the existing notification in place, so there's no separate
// "create" vs "patch" native call to make. On iOS this starts or updates the
// Live Activity instead.
export async function startActiveJobNotification(job: ActiveJobNotificationJob): Promise<void> {
  if (Platform.OS === "ios") {
    await showLiveActivity(job);
    return;
  }

  const checkedInAt = job.workerJobDetails.checkedInAt;
  const progress = computeJobProgress({ ...job, checkedInAt });

  await showActiveJobNotification({
    jobId: job._id,
    assignmentId: job.workerJobDetails._id,
    title: progress.isOvertime ? "Job still in progress" : "Job in progress",
    subtitle: subtitleFor(job),
    timingLine: formatTimingLine(job, progress),
    checkedInAtMs: checkedInAt ? dayjs(checkedInAt).valueOf() : undefined,
    percentage: progress.percentage,
    deepLink: "onclockly://clock",
  });
}

export const updateActiveJobNotification = startActiveJobNotification;

export async function stopActiveJobNotification(): Promise<void> {
  if (Platform.OS === "ios") {
    await endLiveActivity();
    return;
  }
  await cancelActiveJobNotification();
}

// The backend is authoritative — this is the single place that decides
// whether the notification should exist at all, driven entirely by the
// current /workers/active-job response. Safe to call as often as that query
// re-resolves (app launch, focus, mutation-triggered invalidation): both
// show() and cancel() are idempotent on the native side.
export async function reconcileActiveJobNotification(job: ActiveJobNotificationJob | null): Promise<void> {
  const isActive = !!job && job.workerJobDetails?.status === "in-progress" && !!job.workerJobDetails.checkedInAt;

  if (isActive) {
    await startActiveJobNotification(job!);
  } else {
    await stopActiveJobNotification();
  }
}

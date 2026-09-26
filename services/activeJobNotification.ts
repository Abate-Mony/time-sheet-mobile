import dayjs, { type Dayjs } from "dayjs";
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
    status?: string;
    assignmentId: string;
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

// start/update are the same operation — Android's notify() with a stable ID
// always updates the existing notification in place, so there's no separate
// "create" vs "patch" native call to make.
export async function startActiveJobNotification(job: ActiveJobNotificationJob): Promise<void> {
  const checkedInAt = job.workerJobDetails.checkedInAt;
  const progress = computeJobProgress({ ...job, checkedInAt });

  await showActiveJobNotification({
    jobId: job._id,
    assignmentId: job.workerJobDetails.assignmentId,
    title: progress.isOvertime ? "Job still in progress" : "Job in progress",
    subtitle: subtitleFor(job),
    timingLine: formatTimingLine(job, progress),
    checkedInAtMs: checkedInAt ? dayjs(checkedInAt).valueOf() : undefined,
    percentage: progress.percentage,
    deepLink: "inprn://clock",
  });
}

export const updateActiveJobNotification = startActiveJobNotification;

export async function stopActiveJobNotification(): Promise<void> {
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

import { queryClient } from "@/lib/queryClient";
import type { SingleJobResponse } from "@/utils/types";

type DetailJob = SingleJobResponse["job"];

// Lists and the job details screen return the same job in slightly different
// shapes: lists carry workerJobDetails.assignmentId, the details endpoint the
// full assignment with its _id. Enough overlaps that a list copy can stand in
// for the details while the real ones load (or can't, offline).
function toDetailShape(job: any): DetailJob {
  const details = job.workerJobDetails;
  return {
    ...job,
    workerJobDetails: details ? { ...details, _id: details._id ?? details.assignmentId } : null,
  };
}

function findJobIn(value: unknown, id: string, depth: number): any | null {
  if (!value || typeof value !== "object" || depth > 5) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobIn(item, id, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const obj = value as Record<string, unknown>;
  if (obj._id === id && typeof obj.title === "string" && typeof obj.startTime === "string") return obj;
  for (const child of Object.values(obj)) {
    const found = findJobIn(child, id, depth + 1);
    if (found) return found;
  }
  return null;
}

// The freshest copy of a job already sitting in the query cache — jobs lists,
// Home's jobs, the next shift, the active shift, the schedule (all restored
// from the offline cache too). Lets job details render instantly, and
// offline, even for a job never opened before. `updatedAt` is when that copy
// was fetched, so the screen can say how old it is.
export function findCachedJob(id: string): { job: DetailJob; updatedAt: number } | null {
  let best: { job: DetailJob; updatedAt: number } | null = null;

  for (const query of queryClient.getQueryCache().getAll()) {
    if (query.queryKey[0] === "job") continue; // the details query itself
    const found = findJobIn(query.state.data, id, 0);
    if (found && (!best || query.state.dataUpdatedAt > best.updatedAt)) {
      best = { job: toDetailShape(found), updatedAt: query.state.dataUpdatedAt };
    }
  }
  return best;
}

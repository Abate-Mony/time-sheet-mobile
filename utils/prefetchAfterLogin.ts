import { queryClient } from "@/lib/queryClient";
import { activeWorkerJob } from "@/utils/activeWorkerJob";
import { currentWeekStartKey, dashboardJobs } from "@/utils/dashboardJobs";
import { workerDashboardstats } from "@/utils/workerDashboardStats";

// Loads the data a worker most needs right after they sign in — Profile
// stats, Home's jobs, the shift they're on — while they still have signal.
// The offline cache (lib/queryPersistence.ts) saves it straight away, so
// those screens work offline even if the worker never opened them online.
//
// Fire-and-forget: never awaited by the login flow, never throws (each
// failure just means that screen loads normally when it's opened).
export function prefetchAfterLogin(): void {
  void Promise.allSettled([
    queryClient.prefetchQuery(workerDashboardstats()),
    queryClient.prefetchQuery(dashboardJobs(currentWeekStartKey())),
    queryClient.prefetchQuery(activeWorkerJob()),
  ]);
}

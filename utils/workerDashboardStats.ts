import customFetch from "@/utils/customFetch";
import type { WorkerDashboardStats } from "@/utils/types/workerType";

// The worker's job counts and this month's hours/earnings — shown on
// Profile and Home. Shared query options (kept out of the Profile route file
// so Home and the post-login prefetch don't import a screen to get it).
// Saved for offline use — see lib/queryPersistence.ts.
export const workerDashboardstats = () => ({
  queryKey: ["worker-dashboard-stats"],
  queryFn: async () => {
    const { data } = await customFetch.get<WorkerDashboardStats>("/workers/stats");
    return data;
  },
});

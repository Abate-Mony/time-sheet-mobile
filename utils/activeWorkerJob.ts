import customFetch from "@/utils/customFetch";
import type { CreateJobForm } from "@/utils/types";

// The shift the worker is clocked into right now, if any. Shared query
// options — the Clock screen, the root layout (ongoing notification / Live
// Activity, shift-end alert) and Contact Manager all read the same
// ["active-job"] cache entry. Kept out of the Clock route file so other
// files don't import a screen to get it.
export const activeWorkerJob = () => ({
  queryKey: ["active-job"],
  queryFn: async (): Promise<
    { success: true; job: null } | { job: CreateJobForm }
  > => {
    const { data } = await customFetch.get("/workers/active-job");
    return data;
  },
});

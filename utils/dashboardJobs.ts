import customFetch from "@/utils/customFetch";
import type { MyJobsResponse, WorkerJob } from "@/utils/types";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(isoWeek);

// job.date arrives as a full ISO datetime at UTC midnight — keep just the
// calendar day so Home's week strip can match it against YYYY-MM-DD keys.
function toDateKey(rawDate: string) {
  return dayjs.utc(rawDate).format("YYYY-MM-DD");
}

/** Monday of the current week, as YYYY-MM-DD — the dashboard's start date. */
export const currentWeekStartKey = () => dayjs().startOf("isoWeek").format("YYYY-MM-DD");

// Home's jobs: this week onward. Shared query options so the post-login
// prefetch (utils/prefetchAfterLogin.ts) can load exactly what Home shows.
// Starts with "jobs", so it's saved for offline use and refreshes whenever
// anything invalidates ["jobs"] (clock in/out, accept, cancel, claim).
export const dashboardJobs = (weekStartKey: string) => ({
  queryKey: ["jobs", "dashboard", weekStartKey],
  queryFn: async (): Promise<WorkerJob[]> => {
    // Scoped from the start of this week forward instead of an unbounded
    // fetch — a worker with 100+ older assignments could otherwise never
    // see this week's or upcoming shifts, since the backend returns the
    // oldest assignments first when unbounded. weekStart is always <=
    // today by definition, and the 150 cap comfortably covers a week
    // plus a healthy upcoming window (a real test worker had ~103
    // assignments in an entire month).
    const { data } = await customFetch.get<MyJobsResponse>("/workers", {
      params: {
        start: weekStartKey,
        status: "all",
        limit: 150,
      },
    });
    return data.jobs.map(j => ({ ...j, date: toDateKey(j.date) }));
  },
});

import { router } from "expo-router"

// Opens a job's details screen from anywhere in the app.
//
// /jobs/[id] lives inside the Jobs tab's own stack, but is opened from other
// tabs too (Home, Clock, Schedule, Earnings, notification taps). Without
// `withAnchor`, arriving from outside creates that stack with ONLY the
// details screen in it — so the Jobs tab then has no all-jobs list to go
// back to, and tapping the Jobs icon stays stuck on the job. `withAnchor`
// loads the stack's anchor (see unstable_settings in jobs/_layout.tsx)
// underneath; inside the Jobs stack it's a no-op.
export function openJob(id: string) {
  router.navigate({ pathname: "/jobs/[id]", params: { id } }, { withAnchor: true })
}

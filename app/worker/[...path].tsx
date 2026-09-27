import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect } from "react"

// Universal Links (iOS) / App Links (Android) land here for any
// https://timeshift.inprn.com/worker/* URL (see app.json's
// associatedDomains/intentFilters, and work.wk/public/.well-known/ for the
// site-side half of this). This app's own routes have no "/worker" prefix
// (it's worker-only, unlike work.wk which also serves admin routes under
// the same domain), so the prefix is stripped and the remainder is pushed
// as a normal in-app route — e.g. a "New shift assigned" email linking to
// https://timeshift.inprn.com/worker/jobs/<id> lands on this app's own
// /jobs/[id], the same screen NotificationTapHandler (app/_layout.tsx)
// already opens for a tapped push notification.
export default function WorkerLinkRedirect() {
  const { path } = useLocalSearchParams<{ path?: string[] }>()
  const router = useRouter()

  useEffect(() => {
    const target = path && path.length ? `/${path.join("/")}` : "/"
    router.replace(target as any)
  }, [path, router])

  return null
}

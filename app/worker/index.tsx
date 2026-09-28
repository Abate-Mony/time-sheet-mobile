import { useRouter } from "expo-router"
import { useEffect } from "react"

// The bare https://app.onclockly.com/worker (no further path) case —
// [...path].tsx's catch-all requires at least one segment, so this covers
// the exact-root case separately rather than relying on optional-catch-all
// syntax.
export default function WorkerRootRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/")
  }, [router])

  return null
}

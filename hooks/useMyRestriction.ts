import { useAuth } from "@/context/AuthContext"
import { getMyRestriction } from "@/utils/api-request-functions"
import { useQuery } from "@tanstack/react-query"

// Shared by the suspended-account overlay (app/_layout.tsx) and the
// restricted-access banner (app/(tabs)/_layout.tsx) so there's one cached
// query for both, not two independent fetches of the same thing.
export function useMyRestriction() {
  const { accessToken } = useAuth()
  return useQuery({
    queryKey: ["my-restriction"],
    queryFn: getMyRestriction,
    enabled: !!accessToken,
  })
}

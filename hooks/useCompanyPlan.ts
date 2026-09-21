import { getCompanyPlan } from "@/utils/api-request-functions"
import type { PlanLimits } from "@/utils/types"
import { useQuery } from "@tanstack/react-query"

// Mirrors work.wk's src/hooks/useCompanyPlan.ts — same query key
// (['company-plan']) so it dedupes against any other screen that reads it,
// same "fail open while loading" behaviour (a gated control shouldn't
// flash disabled then enabled a moment later; the backend re-checks
// independently on every request regardless of what this shows).
export function useCompanyPlan() {
    const { data, isLoading } = useQuery({ queryKey: ["company-plan"], queryFn: getCompanyPlan })

    const hasFeature = (feature: keyof PlanLimits["features"]): boolean =>
        isLoading || !data ? true : data.limits.features[feature]

    return { plan: data?.plan, limits: data?.limits, maxWorkers: data?.limits.maxWorkers, isLoading, hasFeature }
}

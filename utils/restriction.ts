// utils/restriction.ts
//
// Mirrors the backend's UserRestriction model (userRestrictionModel.ts) and
// the web app's restriction data/helpers (work.wk/src/data/restrictionMockData.ts)
// — same types, same precedence rules, kept in sync by hand since this is a
// separate codebase. If RESTRICTABLE_ACTIONS changes server-side, update here too.

export type RestrictionCapability =
  | "accept_jobs"
  | "claim_jobs"
  | "clock_in"
  | "clock_out"
  | "edit_profile"
  | "view_timesheets"
  | "view_earnings"
  | "view_messages"

export type RestrictionReason =
  | "document_expired"
  | "disciplinary"
  | "no_show"
  | "left_company"
  | "other"

export type RestrictionRemedy = "upload_document" | "contact_manager" | "appeal" | "none"

export type AccessLevel = "none" | "read_only" | "limited"

export type AppealStatus = "pending" | "accepted" | "rejected"

export interface AppealState {
  submittedAt?: string
  message?: string
  status?: AppealStatus
  respondedAt?: string
  response?: string
}

export interface AccountRestriction {
  _id: string
  accessLevel: AccessLevel
  restrictions: RestrictionCapability[]
  reason: RestrictionReason
  message: string
  remedy: RestrictionRemedy
  canAppeal: boolean
  startsAt: string
  expiresAt?: string | null
  liftedAt?: string
  liftReason?: string
  appeal?: AppealState
}

export const REASON_LABELS: Record<RestrictionReason, string> = {
  document_expired: "Document expired",
  disciplinary: "Disciplinary",
  no_show: "No show",
  left_company: "Left company",
  other: "Other",
}

export const ALL_CAPABILITIES: RestrictionCapability[] = [
  "accept_jobs", "claim_jobs", "clock_in", "clock_out",
  "edit_profile", "view_timesheets", "view_earnings", "view_messages",
]

// Same precedence rules as the backend's UserRestriction.blocks() — kept
// identical on purpose so the app can't show something as allowed that the
// server will actually reject (or vice versa).
export function can(restriction: AccountRestriction | null, capability: RestrictionCapability): boolean {
  if (!restriction) return true
  if (restriction.accessLevel === "none") return false
  if (restriction.accessLevel === "read_only") {
    return ["view_timesheets", "view_earnings", "view_messages"].includes(capability)
  }
  return !restriction.restrictions.includes(capability)
}

export function isRestricted(restriction: AccountRestriction | null): boolean {
  return restriction !== null && restriction.accessLevel !== "none"
}

export function isSuspended(restriction: AccountRestriction | null): boolean {
  return restriction !== null && restriction.accessLevel === "none"
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

import dayjs from "dayjs"
import type { AssignmentStatus } from "./types"

export type Frequency = "daily" | "weekly" | "monthly"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function describeRecurrence(s: { frequency: Frequency; interval: number; daysOfWeek?: number[] }): string {
  const days = s.daysOfWeek?.map(d => DAY_NAMES[d]).join(", ") ?? ""
  if (s.frequency === "daily") {
    return s.interval === 1 ? "Every day" : `Every ${s.interval} days`
  }
  if (s.frequency === "weekly") {
    const dStr = days || "weekly"
    return s.interval === 1 ? `Every ${dStr}` : `Every ${s.interval} weeks on ${dStr}`
  }
  if (s.frequency === "monthly") {
    return s.interval === 1 ? "Monthly" : `Every ${s.interval} months`
  }
  return ""
}

export function fmtDate(iso: string): string {
  return dayjs(iso).format("ddd, D MMM")
}

export function statusStyle(s: AssignmentStatus): { bg: string; text: string } {
  if (s === "accepted") return { bg: "#ECFDF5", text: "#047857" }
  if (s === "pending") return { bg: "#FFFBEB", text: "#B45309" }
  if (s === "declined") return { bg: "#FEF2F2", text: "#DC2626" }
  if (s === "in-progress") return { bg: "#EFF6FF", text: "#1D4ED8" }
  if (s === "completed") return { bg: "#F1F5F9", text: "#64748B" }
  return { bg: "#F1F5F9", text: "#94A3B8" }
}

export function statusLabel(s: AssignmentStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")
}

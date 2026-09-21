// ── User ──────────────────────────────────────────────────────────────────────

import z from "zod";
import { createJobSchema, editProfileSchema } from "./schema";

export type UserRole = "admin" | "manager" | "worker"
export type CreateJobForm = Omit<z.infer<typeof createJobSchema>, "client"> & {
  // Overrides the schema's plain-string form value — see JobClientRef above.
  client?: JobClientRef | null;
};
export type ClientStatus = 'active' | 'inactive'
export type ChargeType = 'hourly' | 'fixed'

// A worker's self-uploaded document (ID, right-to-work, certifications,
// ...). Optional everywhere it's used — nothing in this app requires a
// worker to have any on file.
export interface WorkerDocument {
  _id: string
  name: string
  url: string
  mimeType?: string
  uploadedAt: string
}

export interface ClientContact {
  name?: string
  role?: string
  email?: string
  phone?: string
  isPrimary: boolean
}

export interface ClientAddress {
  line1?: string
  line2?: string
  city?: string
  county?: string
  postcode?: string
  country?: string
}

export interface Client {
  _id: string
  name: string
  contacts: ClientContact[]
  primaryContact?: ClientContact | null
  phone?: string
  billingEmail?: string
  vatNumber?: string
  address?: ClientAddress
  formattedAddress?: string
  defaultChargeType: ChargeType
  defaultChargeRate: number
  paymentTermsDays: number
  status: ClientStatus
  notes?: string
  createdAt: string
  updatedAt: string
  jobCount?: number
  activeJobCount?: number
}
export interface JobClientRef {
  _id: string;
  name: string;
  status?: ClientStatus;
  contacts?: ClientContact[];
  phone?: string;
  billingEmail?: string;
  address?: ClientAddress;
  defaultChargeType?: ChargeType;
  defaultChargeRate?: number;
}
export interface User {
  _id: string
  email: string
  fullname: string
  role: UserRole
  createdBy?: string
  isVerified: boolean
  isActive: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
  phone?: string
  gender?: "Male" | "Female" | "Other" | "Prefer not to say"
}

// Payload shape sent to the API (post-transform: no empty-string gender).
export type EditProfileForm = z.output<typeof editProfileSchema>
// Shape react-hook-form works with (pre-transform: gender can be "" from the placeholder option).
export type EditProfileFormInput = z.input<typeof editProfileSchema>

// ── Notification preferences ─────────────────────────────────────────────────

export type NotificationChannel = "email" | "push" | "inApp"

export type NotificationEvent =
  | "job_assigned"
  | "job_accepted"
  | "job_declined"
  | "worker_checked_in"
  | "worker_late"
  | "worker_checked_out"
  | "job_completed"
  | "geofence_warning"
  | "timesheet_submitted"
  | "timesheet_approved"
  | "timesheet_rejected"

export type EventNotificationPreference = {
  email: boolean
  push: boolean
  inApp: boolean
}

export interface NotificationPreferences {
  _id?: string
  user?: string
  company?: string
  emailEnabled: boolean
  pushEnabled: boolean
  inAppEnabled: boolean
  events: Record<NotificationEvent, EventNotificationPreference>
}

// ── Timesheets ────────────────────────────────────────────────────────────────

export type TimesheetPeriodType = "weekly" | "biweekly" | "monthly"

export interface TimesheetAssignment {
  _id?: string
  title?: string
  date?: string
  startTime?: string
  endTime?: string
  minutes?: number
}

export interface TimesheetSummaryResponse {
  totalJobs: number
  shiftsCount: number
  hasData: boolean
  totalMinutes: number
  totalHours: number
  assignments: TimesheetAssignment[]
}

// ── Job ───────────────────────────────────────────────────────────────────────

export type JobStatus = "draft" | "published" | "completed" | "cancelled"
export type JobPriority = "low" | "medium" | "high" | "urgent"

// Optional single file a manager attaches to a job — e.g. a photo of a door
// passcode or access instructions — visible to assigned workers.
export interface JobAttachment {
  url: string
  filename: string
  mimeType?: string
  uploadedAt: string
}

export interface SiteContact {
  name?: string
  phone?: string
  email?: string
}

// The slim shape a Job carries once it's site-backed — historical facts as
// they were at scheduling time, never re-synced from the live Site.
export interface JobSiteSnapshot {
  name?: string
  contact?: SiteContact
  accessInstructions?: string
  parkingInstructions?: string
}

export interface Job {
  _id: string
  company: string
  client: {
    name?: string
  }
  title: string
  description: string
  location: string
  address: string
  coordinates?: { lat: number; lng: number }
  date: string          // ISO string from the API
  startTime: string     // "HH:mm"
  endTime: string       // "HH:mm"
  hours: number
  status: JobStatus
  priority: JobPriority
  requiredWorkers: number
  supervisor?: string
  payRate: number
  chargeRate: number
  recurringJob: string | null
  notes: string
  instructions: string
  isPublished: boolean
  isDeleted: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  minutes: number
  attachment?: JobAttachment | null
  siteSnapshot?: JobSiteSnapshot | null
}

// ── Job assignment ────────────────────────────────────────────────────────────

export type AssignmentStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "in-progress"
  | "completed"
  | "cancelled"

export interface JobAssignment {
  _id: string
  job: string
  worker: string
  createdBy: string
  email: string
  fullname: string
  status: AssignmentStatus
  acceptedAt?: string
  declinedAt?: string
  checkedInAt?: string
  checkedOutAt?: string
  completedAt?: string
  cancellationReason: string
  workerNotes: string
  managerNotes: string
  hoursWorked: number
  overtimeHours: number
  payRate: number
  totalPay: number
  createdAt: string
  updatedAt: string
}

// ── What /workers (getMyJobs) actually returns ────────────────────────────────
// Job fields, but `status` is overridden by the assignment status,
// plus the worker's own timestamps nested under workerJobDetails.

export interface WorkerJobDetails {
  assignmentId: string
  acceptedAt?: string
  declinedAt?: string
  checkedInAt?: string
  checkedOutAt?: string
  completedAt?: string
  hoursWorked: number
}

export interface WorkerJob extends Omit<Job, "status"> {
  status: AssignmentStatus
  workerJobDetails: WorkerJobDetails
}

// ── Company plan ──────────────────────────────────────────────────────────────

export type CompanyPlanId = "free" | "starter" | "professional" | "enterprise"

export interface PlanLimits {
  maxWorkers: number // -1 = unlimited
  maxJobsPerMonth: number // -1 = unlimited
  features: {
    gpsVerification: boolean
    recurringJobs: boolean
    openShifts: boolean
    advancedReports: boolean
    aiJobAssistant: boolean
    aiDashboardInsights: boolean
    aiDataAssistant: boolean
    externalApiAccess: boolean
  }
}

export interface CompanyPlanInfo {
  success: boolean
  plan: CompanyPlanId
  maxWorkers: number
  limits: PlanLimits
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface LoginResponse {
  user: User
  token: string
}

export interface MyJobsResponse {
  jobs: WorkerJob[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface SingleJobResponse {
  job: Omit<Job, "status"> & {
    status: AssignmentStatus | JobStatus
    workerJobDetails: JobAssignment | null
  }
  success: boolean
}

export interface UpdateStatusResponse {
  success: boolean
  message: string
  assignment: JobAssignment
}

// ── Recurring assignments ─────────────────────────────────────────────────────

export interface WorkerRecurringShift {
  jobId: string
  assignmentId: string
  date: string
  startTime: string
  endTime: string
  location?: string
  status: AssignmentStatus
}

export interface WorkerRecurringGroup {
  recurringJobId: string
  title: string
  location?: string
  client?: string
  recurrenceLabel: string
  startTime: string
  endTime: string
  pendingCount: number
  acceptedCount: number
  declinedCount: number
  upcomingCount: number
  nextShift?: { jobId: string; assignmentId: string; date: string; startTime: string; endTime: string }
  shifts: WorkerRecurringShift[]
}

export type DialogState = "confirm" | "loading" | "success" | "partial" | "error" | "empty"
// ── User ──────────────────────────────────────────────────────────────────────

import z from "zod";
import { createJobSchema } from "./schema";

export type UserRole = "admin" | "manager" | "worker"
export type CreateJobForm = Omit<z.infer<typeof createJobSchema>, "client"> & {
  // Overrides the schema's plain-string form value — see JobClientRef above.
  client?: JobClientRef | null;
};
export type ClientStatus = 'active' | 'inactive'
export type ChargeType = 'hourly' | 'fixed'

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
}

// ── Job ───────────────────────────────────────────────────────────────────────

export type JobStatus = "draft" | "published" | "completed" | "cancelled"
export type JobPriority = "low" | "medium" | "high" | "urgent"

export interface Job {
  _id: string
  company: string
  client: string
  title: string
  description: string
  location: string
  address: string
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
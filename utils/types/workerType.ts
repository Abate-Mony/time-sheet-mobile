export type AssignmentStatus =
    | "pending"
    | "accepted"
    | "declined"
    | "in-progress"
    | "completed"
    | "cancelled";

export interface WorkerMonthlyStats {
    earnings: number;
    hoursWorked: number;
    completedJobs: number;
    averagePayRate: number;
}

export interface WorkerDashboardStats {
    success: boolean;

    jobStats: Record<
        AssignmentStatus,
        number
    >;

    monthly: WorkerMonthlyStats;

    totalJobs: number;
}
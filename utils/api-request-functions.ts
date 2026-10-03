import { isAxiosError } from "axios";
import Toast from "react-native-toast-message";
import { queryClient } from "../lib/queryClient";

import customFetch from "./customFetch";
import { getCurrentPosition } from "./getPosition";
import { enqueueClockAction } from "./offlineClockQueue";
import type {
  CompanyPlanInfo,
  EditProfileForm,
  NotificationPreferences,
  OpenShiftClaim,
  SingleJobResponse,
  TimeOffRequest,
  TimeOffType,
  TimesheetPeriodType,
  TimesheetSummaryResponse,
  User,
  WorkerDocument,
} from "./types";

// GET /companies/plan is not role-restricted server-side (only
// authenticateUser/loadRestriction at the router level), so a worker can
// read their own company's plan the same as an admin/manager can.
export const getCompanyPlan = async (): Promise<CompanyPlanInfo> => {
  const { data } = await customFetch.get<CompanyPlanInfo>("/companies/plan");
  return data;
};

export const getMyDocuments = async (): Promise<WorkerDocument[]> => {
  const { data } = await customFetch.get<{ documents: WorkerDocument[] }>("/documents/me");
  return data.documents;
};

export const uploadMyDocument = async ({
  name,
  uri,
  fileName,
  mimeType,
}: {
  name: string;
  uri: string;
  fileName: string;
  mimeType: string;
}): Promise<WorkerDocument[]> => {
  const formData = new FormData();
  formData.append("name", name);
  // React Native's FormData takes a {uri, name, type} object for a file
  // part instead of a Blob/File — axios/RN's polyfilled FormData knows how
  // to read it off the native uri directly.
  formData.append("document", {
    uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const { data } = await customFetch.post<{ documents: WorkerDocument[] }>(
    "/documents/me",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data.documents;
};

export const deleteMyDocument = async (documentId: string): Promise<WorkerDocument[]> => {
  const { data } = await customFetch.delete<{ documents: WorkerDocument[] }>(`/documents/me/${documentId}`);
  return data.documents;
};

const showSuccess = (message: string) => {
  Toast.show({
    type: "success",
    text1: message,
  });
};

const showError = (message: string) => {
  Toast.show({
    type: "error",
    text1: message,
  });
};

const getApiErrorMessage = (err: unknown): string => {
  if (isAxiosError(err)) {
    return (
      err.response?.data?.msg ??
      err.response?.data?.message ??
      "Something went wrong."
    );
  }

  return err instanceof Error
    ? err.message
    : "Something went wrong.";
};

function isNetworkError(err: unknown): boolean {
  // A response means the server was reached (and rejected the request for
  // a real reason) — no response at all is what a dead-zone/no-signal
  // failure looks like to axios.
  return isAxiosError(err) && !err.response;
}

function generateQueueId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const changeWorkerJobStaus = async (
  jobId: string,
  status:
    | "accepted"
    | "declined"
    | "in-progress"
    | "completed"
    | "cancelled",
  opts?: { reason?: string; release?: boolean; jobSnapshot?: SingleJobResponse["job"] }
): Promise<{
  success: boolean;
  message?: string;
  queuedOffline?: boolean;
}> => {
  const needsLocation =
    status === "in-progress" ||
    status === "completed";

  // Never throws (see getPosition.ts) — safe outside the try below.
  const location = needsLocation
    ? await getCurrentPosition()
    : undefined;

  try {
    await customFetch.patch(
      `/workers/${jobId}/status`,
      {
        status,

        ...(location && {
          location,
        }),

        ...(opts?.reason && {
          reason: opts.reason,
        }),

        ...(opts?.release && {
          release: true,
        }),
      }
    );

    showSuccess(opts?.release ? "Shift released back to open shifts" : "Job updated successfully");

    await queryClient.invalidateQueries({
      queryKey: ["jobs"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["job", jobId],
    });

    await queryClient.invalidateQueries({
      queryKey: ["worker-stats"],
    });

    if (
      status === "completed" ||
      status === "declined" ||
      status === "cancelled"
    ) {
      queryClient.setQueryData(
        ["active-job"],
        {
          success: true,
          job: null,
        }
      );
    }

    await queryClient.invalidateQueries({
      queryKey: ["active-job"],
    });

    if (opts?.release) {
      await queryClient.invalidateQueries({
        queryKey: ["open-shifts"],
      });
    }

    return {
      success: true,
    };
  } catch (err) {
    // Only clock-in/out are eligible for offline queueing — the two
    // actions a worker needs to take physically at a job site regardless
    // of signal. Accept/decline/cancel can just wait for a real connection.
    if (
      (status === "in-progress" || status === "completed") &&
      isNetworkError(err)
    ) {
      const occurredAt = new Date().toISOString();

      await enqueueClockAction({
        id: generateQueueId(),
        jobId,
        status,
        occurredAt,
        location: location ?? null,
      });

      if (status === "completed") {
        queryClient.setQueryData(["active-job"], { success: true, job: null });
      } else if (opts?.jobSnapshot) {
        // Only the caller viewing the job's own detail page has the full
        // job data on hand to fake this with — good enough coverage (that's
        // the only place "in-progress" is triggered from). Without it, the
        // active-job screen just won't reflect the clock-in until sync.
        const snapshot = opts.jobSnapshot;
        queryClient.setQueryData(["active-job"], {
          job: {
            ...snapshot,
            status: "in-progress",
            workerJobDetails: {
              ...(snapshot.workerJobDetails ?? {}),
              status: "in-progress",
              checkedInAt: occurredAt,
            },
          },
        });
      }

      Toast.show({
        type: "info",
        text1: status === "in-progress" ? "Clocked in — offline" : "Clocked out — offline",
        text2: "No connection — this will sync automatically once you're back online.",
      });

      return { success: true, queuedOffline: true };
    }

    const message = getApiErrorMessage(err);

    showError(message);

    return {
      success: false,
      message,
    };
  }
};

// Check/uncheck one item on a job's checklist — shared across every worker
// assigned, not per-worker. No toast on success — this fires on every tap
// and a toast per checkbox would be noisy; the checkbox itself is the
// feedback.
export const toggleChecklistItem = async (jobId: string, itemId: string, done: boolean): Promise<boolean> => {
  try {
    await customFetch.patch(`/workers/${jobId}/checklist/${itemId}`, { done });
    await queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    return true;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return false;
  }
};

export const requestTimeOff = async (params: {
  startDate: string;
  endDate: string;
  type: TimeOffType;
  reason?: string;
}): Promise<boolean> => {
  try {
    await customFetch.post("/time-off/me", params);
    showSuccess("Your time-off request has been sent to your manager.");
    await queryClient.invalidateQueries({ queryKey: ["time-off", "me"] });
    return true;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return false;
  }
};

export const getMyTimeOffRequests = async (): Promise<TimeOffRequest[]> => {
  const { data } = await customFetch.get<{ requests: TimeOffRequest[] }>("/time-off/me");
  return data.requests;
};

export const cancelTimeOffRequest = async (id: string): Promise<boolean> => {
  try {
    await customFetch.patch(`/time-off/me/${id}/cancel`);
    showSuccess("Request cancelled.");
    await queryClient.invalidateQueries({ queryKey: ["time-off", "me"] });
    return true;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return false;
  }
};

// This app has no in-app account creation (a company admin provisions every
// worker account), so there's nothing to self-service delete here either —
// this sends a documented request to the company's admin(s), who can
// deactivate/remove the account from the web dashboard.
export const requestAccountDeletion = async (reason?: string): Promise<boolean> => {
  try {
    await customFetch.post("/workers/me/request-deletion", reason ? { reason } : {});
    showSuccess("Your request has been sent to your company admin.");
    return true;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return false;
  }
};

export const claimOpenShift = async (jobId: string): Promise<boolean> => {
  try {
    const { data } = await customFetch.post(`/workers/open-shifts/${jobId}/claim`);

    showSuccess(
      data?.needsApproval
        ? "Claim sent — your manager needs to approve it"
        : "Shift picked up successfully"
    );

    await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    await queryClient.invalidateQueries({ queryKey: ["open-shifts"] });
    await queryClient.invalidateQueries({ queryKey: ["my-claims"] });
    return true;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return false;
  }
};

export const takeShiftGiveaway = async (assignmentId: string): Promise<boolean> => {
  try {
    const { data } = await customFetch.post(`/workers/giveaways/${assignmentId}/take`);

    showSuccess(
      data?.needsApproval
        ? "Request sent — your manager needs to approve it"
        : "Shift picked up successfully"
    );

    await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    await queryClient.invalidateQueries({ queryKey: ["open-shifts"] });
    await queryClient.invalidateQueries({ queryKey: ["my-claims"] });
    return true;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return false;
  }
};

// Offering keeps the worker on the shift until someone takes it — unlike
// changeWorkerJobStaus's release, which drops them off immediately.
export const offerShiftGiveaway = async (jobId: string, assignmentId: string, note?: string): Promise<boolean> => {
  try {
    await customFetch.patch(`/workers/assignments/${assignmentId}/giveaway`, note ? { note } : {});
    showSuccess("Shift offered to other workers");
    await queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    return true;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return false;
  }
};

export const cancelShiftGiveaway = async (jobId: string, assignmentId: string): Promise<boolean> => {
  try {
    await customFetch.delete(`/workers/assignments/${assignmentId}/giveaway`);
    showSuccess("Offer taken back");
    await queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    return true;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return false;
  }
};

export const getMyClaims = async (): Promise<OpenShiftClaim[]> => {
  const { data } = await customFetch.get<{ claims: OpenShiftClaim[] }>("/workers/claims");
  return data.claims;
};

export const withdrawOpenShiftClaim = async (assignmentId: string): Promise<boolean> => {
  try {
    await customFetch.patch(`/workers/assignments/${assignmentId}/withdraw-claim`);
    showSuccess("Claim withdrawn");
    await queryClient.invalidateQueries({ queryKey: ["my-claims"] });
    await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    return true;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return false;
  }
};

export const updateWorkerProfile = async (
  profile: EditProfileForm
): Promise<User | null> => {
  try {
    const { data } = await customFetch.patch<{ user: User }>("/users/current-user", profile);
    showSuccess("Profile updated successfully");
    return data.user;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return null;
  }
};

export const uploadProfilePhoto = async ({
  uri,
  fileName,
  mimeType,
}: {
  uri: string;
  fileName: string;
  mimeType: string;
}): Promise<User | null> => {
  try {
    const formData = new FormData();
    // React Native's FormData takes a {uri, name, type} object for a file
    // part instead of a Blob/File — see documents.tsx's uploadMyDocument
    // for the same pattern.
    formData.append("photo", {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    const { data } = await customFetch.post<{ user: User }>(
      "/users/current-user/photo",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    showSuccess("Profile photo updated");
    return data.user;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return null;
  }
};

export const deleteProfilePhoto = async (): Promise<User | null> => {
  try {
    const { data } = await customFetch.delete<{ user: User }>("/users/current-user/photo");
    showSuccess("Profile photo removed");
    return data.user;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return null;
  }
};

export const getNotificationPreferences = async () => {
  const { data } = await customFetch.get<{
    success: boolean;
    preferences: NotificationPreferences;
  }>("/notification-preferences/me");
  return data;
};

export type UpdateNotificationPreferencesPayload = Partial<
  Pick<NotificationPreferences, "emailEnabled" | "pushEnabled" | "inAppEnabled">
> & {
  events?: Partial<Record<string, Partial<Record<"email" | "push" | "inApp", boolean>>>>;
};

export const updateNotificationPreferences = async (
  preferences: UpdateNotificationPreferencesPayload
): Promise<boolean> => {
  try {
    await customFetch.patch("/notification-preferences/me", preferences);
    return true;
  } catch (err) {
    showError(getApiErrorMessage(err));
    return false;
  }
};

export const getTimesheetSummary = async ({
  period,
  start,
  end,
}: {
  period: TimesheetPeriodType;
  start: string;
  end: string;
}) => {
  const { data } = await customFetch.get<{ summary: TimesheetSummaryResponse }>("/timesheets/", {
    params: { period, startDate: start, endDate: end },
  });
  return data;
};

export const startWorkerBreak = async (
  jobId: string
): Promise<boolean> => {
  try {
    const { data } =
      await customFetch.patch(
        `/workers/${jobId}/break/start`
      );

    showSuccess(
      data?.message ?? "Break started."
    );

    await queryClient.invalidateQueries({
      queryKey: ["active-job"],
    });

    return true;
  } catch (err) {
    showError(getApiErrorMessage(err));

    return false;
  }
};

export const endWorkerBreak = async (
  jobId: string
): Promise<boolean> => {
  try {
    const { data } =
      await customFetch.patch(
        `/workers/${jobId}/break/end`
      );

    showSuccess(
      data?.message ?? "Break ended."
    );

    await queryClient.invalidateQueries({
      queryKey: ["active-job"],
    });

    return true;
  } catch (err) {
    showError(getApiErrorMessage(err));

    return false;
  }
};
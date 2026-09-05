import { isAxiosError } from "axios";
import Toast from "react-native-toast-message";
import { queryClient } from "../lib/queryClient";

import customFetch from "./customFetch";
import { getCurrentPosition } from "./getPosition";

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

export const changeWorkerJobStaus = async (
  jobId: string,
  status:
    | "accepted"
    | "declined"
    | "in-progress"
    | "completed",
  opts?: { reason?: string }
): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const needsLocation =
      status === "in-progress" ||
      status === "completed";

    const location = needsLocation
      ? await getCurrentPosition()
      : undefined;

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
      }
    );

    showSuccess("Job updated successfully");

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
      status === "declined"
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

    return {
      success: true,
    };
  } catch (err) {
    const message = getApiErrorMessage(err);

    showError(message);

    return {
      success: false,
      message,
    };
  }
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
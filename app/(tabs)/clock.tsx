
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import {
    Briefcase,
    Camera,
    CheckCircle2,
    Coffee,
    FileText,
    MapPin,
    RotateCcw,
    Square,
} from "lucide-react-native";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NoActiveShift } from "@/components/NoActiveShift";
import customFetch from "@/utils/customFetch";
import type { CreateJobForm, MyJobsResponse } from "@/utils/types";
import { useEffect, useMemo, useState } from "react";
import {
    changeWorkerJobStaus,
    endWorkerBreak,
    startWorkerBreak,
} from "../../utils/api-request-functions";
import {
    formatSecondsAsClock,
    formatSecondsAsDuration,
} from "../../utils/date";

type ClockState = "working" | "break" | "done";

interface WorkerBreak {
  startedAt: string;
  endedAt?: string | null;
}

interface WorkerJobWithDetails extends CreateJobForm {
  workerJobDetails: {
    workerStatus:
      | "pending"
      | "accepted"
      | "declined"
      | "in-progress"
      | "completed"
      | "cancelled";
    assignmentId: string;
    acceptedAt: string;
    declinedAt: string;
    checkedInAt: string;
    completedAt: string;
    breaks?: WorkerBreak[];
  };
}

export const activeWorkerJob = () => ({
  queryKey: ["active-job"],
  queryFn: async (): Promise<
    { success: true; job: null } | { job: CreateJobForm }
  > => {
    const { data } = await customFetch.get("/workers/active-job");
    return data;
  },
});

export default function ClockScreen() {
  const router = useRouter();
  

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery(activeWorkerJob());

  const job = data?.job as WorkerJobWithDetails | null | undefined;

  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [isBreakActionLoading, setIsBreakActionLoading] = useState(false);
  const [doneSnapshot, setDoneSnapshot] = useState<{
    elapsedSeconds: number;
    breakSeconds: number;
    breaksTaken: number;
  } | null>(null);

  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: nextShiftData } = useQuery({
    queryKey: ["jobs", "accepted", "next"],
    queryFn: async () => {
      const { data } = await customFetch.get<MyJobsResponse>("/workers", {
        params: { status: "accepted", limit: 1 },
      });
      return data.jobs[0] ?? null;
    },
    enabled: !isLoading && data?.job === null,
  });

  const workerJobDetails = job?.workerJobDetails;
  const breaksList = workerJobDetails?.breaks ?? [];
  const openBreak = breaksList.find((b) => !b.endedAt);

  const timing = useMemo(() => {
    if (!job?.startTime || !job?.endTime) {
      return {
        totalSeconds: 0,
        scheduledStart: null,
        scheduledEnd: null,
      };
    }

    const today = dayjs().format("YYYY-MM-DD");
    const scheduledStart = dayjs(`${today} ${job.startTime}`);
    let scheduledEnd = dayjs(`${today} ${job.endTime}`);

    if (scheduledEnd.isBefore(scheduledStart)) {
      scheduledEnd = scheduledEnd.add(1, "day");
    }

    return {
      totalSeconds: scheduledEnd.diff(scheduledStart, "second"),
      scheduledStart,
      scheduledEnd,
    };
  }, [job]);

  if (isError) {
    return (
      <SafeAreaView edges={["top"]} style={styles.centered}>
        <Text style={styles.errorTitle}>Could not load active job</Text>
        <Pressable style={styles.primaryButton} onPress={() => refetch()}>
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!isLoading && data?.job === null) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <NoActiveShift nextShift={nextShiftData} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isLoading || !job || !workerJobDetails) {
    return (
      <SafeAreaView edges={["top"]} style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const now = dayjs();
  const checkedInAt = dayjs(workerJobDetails.checkedInAt);

  const elapsedSeconds = Math.max(
    now.diff(checkedInAt, "second"),
    0
  );

  const breakSeconds = breaksList.reduce((total, b) => {
    const breakStart = dayjs(b.startedAt);
    const breakEnd = b.endedAt ? dayjs(b.endedAt) : now;

    return (
      total +
      Math.max(breakEnd.diff(breakStart, "second"), 0)
    );
  }, 0);

  const currentBreakSeconds = openBreak
    ? Math.max(now.diff(dayjs(openBreak.startedAt), "second"), 0)
    : 0;

  const progress =
    timing.totalSeconds > 0
      ? Math.min(
          Math.max(
            (elapsedSeconds / timing.totalSeconds) * 100,
            0
          ),
          100
        )
      : 0;

  const clockState: ClockState = doneSnapshot
    ? "done"
    : openBreak
      ? "break"
      : "working";

  const displayedSeconds =
    clockState === "working"
      ? elapsedSeconds
      : currentBreakSeconds;

  const clock = formatSecondsAsClock(displayedSeconds);

  const startBreak = async () => {
    try {
      setIsBreakActionLoading(true);
      await startWorkerBreak(job._id!);
      await refetch();
    } finally {
      setIsBreakActionLoading(false);
    }
  };

  const endBreak = async () => {
    try {
      setIsBreakActionLoading(true);
      await endWorkerBreak(job._id!);
      await refetch();
    } finally {
      setIsBreakActionLoading(false);
    }
  };

  const finish = async () => {
    setDoneSnapshot({
      elapsedSeconds,
      breakSeconds,
      breaksTaken: breaksList.length,
    });

    await changeWorkerJobStaus(job._id!, "completed");
  };

  if (clockState === "done" && doneSnapshot) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <View style={styles.completeCard}>
          <View style={styles.completeHeader}>
            <View style={styles.completeIcon}>
              <CheckCircle2 size={32} color="#FFFFFF" />
            </View>

            <Text style={styles.completeTitle}>
              Shift Complete!
            </Text>

            <Text style={styles.completeSubtitle}>
              {job.title?.split("—")[0]?.trim()}
            </Text>
          </View>

          <View style={styles.completeBody}>
            <View style={styles.statsRow}>
              <StatCard
                label="Total Time"
                value={formatSecondsAsDuration(
                  doneSnapshot.elapsedSeconds
                )}
              />
              <StatCard
                label="Break Time"
                value={formatSecondsAsDuration(
                  doneSnapshot.breakSeconds
                )}
              />
              <StatCard
                label="Breaks Taken"
                value={String(doneSnapshot.breaksTaken)}
              />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ✓ Your hours have been recorded automatically and
                sent to your manager.
              </Text>
            </View>

            <Pressable style={styles.outlineButton}>
              <Camera size={16} color="#94A3B8" />
              <Text style={styles.outlineButtonText}>
                Upload Site Photos
              </Text>
            </Pressable>

            {!showNote ? (
              <Pressable
                style={styles.outlineButton}
                onPress={() => setShowNote(true)}
              >
                <FileText size={16} color="#94A3B8" />
                <Text style={styles.outlineButtonText}>
                  Add a Note
                </Text>
              </Pressable>
            ) : (
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Any notes for your manager..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={styles.textArea}
              />
            )}

            <Pressable
              style={styles.primaryButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
    <ScrollView
      contentContainerStyle={styles.content}
    >
      <View style={styles.jobCard}>
        <View style={styles.jobIcon}>
          <Briefcase size={15} color="#1E3A5F" />
        </View>

        <View style={styles.jobInfo}>
          <Text style={styles.mutedLabel}>Current Job</Text>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {job.title}
          </Text>
        </View>

        <View style={styles.scheduleInfo}>
          <Text style={styles.scheduleLabel}>Scheduled</Text>
          <Text style={styles.scheduleTime}>
            {job.startTime}–{job.endTime}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.timerCard,
          clockState === "break" && styles.timerCardBreak,
        ]}
      >
        <View style={styles.stateRow}>
          <View
            style={[
              styles.statusDot,
              clockState === "break" && styles.statusDotBreak,
            ]}
          />

          <Text
            style={[
              styles.stateText,
              clockState === "break" && styles.stateTextBreak,
            ]}
          >
            {clockState === "break"
              ? "ON BREAK"
              : "RECORDING HOURS"}
          </Text>
        </View>

        <Text style={styles.timerText}>
          {clock.h}:{clock.m}:{clock.s}
        </Text>

        <Text style={styles.timerCaption}>
          {clockState === "break"
            ? "break duration"
            : "time elapsed"}
        </Text>

        {clockState === "working" && breakSeconds > 0 && (
          <View style={styles.breakBadge}>
            <Coffee size={13} color="#94A3B8" />
            <Text style={styles.breakBadgeText}>
              Break: {formatSecondsAsDuration(breakSeconds)} ·{" "}
              {breaksList.length} taken
            </Text>
          </View>
        )}

        <View style={styles.locationRow}>
          <MapPin size={13} color="#64748B" />
          <Text style={styles.locationText} numberOfLines={1}>
            {job.location}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%` },
            ]}
          />
        </View>
      </View>

      {clockState === "working" && (
        <View style={styles.actionRow}>
          <Pressable
            style={[
              styles.breakButton,
              isBreakActionLoading && styles.disabled,
            ]}
            onPress={startBreak}
            disabled={isBreakActionLoading}
          >
            {isBreakActionLoading ? (
              <ActivityIndicator size="small" />
            ) : (
              <Coffee size={17} color="#B45309" />
            )}

            <Text style={styles.breakButtonText}>
              Take Break
            </Text>
          </Pressable>

          <Pressable
            style={styles.finishButton}
            onPress={finish}
          >
            <Square
              size={14}
              color="#FFFFFF"
              fill="#FFFFFF"
            />
            <Text style={styles.finishButtonText}>
              Finish Work
            </Text>
          </Pressable>
        </View>
      )}

      {clockState === "break" && (
        <View style={styles.breakActions}>
          <Pressable
            style={[
              styles.resumeButton,
              isBreakActionLoading && styles.disabled,
            ]}
            onPress={endBreak}
            disabled={isBreakActionLoading}
          >
            {isBreakActionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <RotateCcw size={17} color="#FFFFFF" />
            )}

            <Text style={styles.resumeButtonText}>
              Resume Work
            </Text>
          </Pressable>

          <Pressable
            style={styles.finishInsteadButton}
            onPress={finish}
          >
            <Square size={14} color="#475569" fill="#475569" />
            <Text style={styles.finishInsteadText}>
              Finish Shift Instead
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.statsRow}>
        <StatCard
          label="Clocked In"
          value={dayjs(workerJobDetails.checkedInAt).format(
            "HH:mm"
          )}
        />
        <StatCard
          label="Billable"
          value={formatSecondsAsDuration(
            Math.max(elapsedSeconds - breakSeconds, 0)
          )}
        />
        <StatCard
          label="Est. Finish"
          value={job.endTime ?? "--:--"}
        />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    
  },

  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F8FAFC",
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },

  jobCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  jobIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E8EEF5",
    justifyContent: "center",
    alignItems: "center",
  },

  jobInfo: {
    flex: 1,
  },

  mutedLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },

  jobTitle: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  scheduleInfo: {
    alignItems: "flex-end",
  },

  scheduleLabel: {
    fontSize: 10,
    color: "#94A3B8",
  },

  scheduleTime: {
    marginTop: 2,
    fontSize: 12,
    color: "#334155",
    fontWeight: "700",
  },

  timerCard: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
  },

  timerCardBreak: {
    backgroundColor: "#78350F",
  },

  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#34D399",
  },

  statusDotBreak: {
    backgroundColor: "#FBBF24",
  },

  stateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.5,
  },

  stateTextBreak: {
    color: "#FBBF24",
  },

  timerText: {
    fontSize: 54,
    lineHeight: 62,
    fontWeight: "800",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
    letterSpacing: -2,
  },

  timerCaption: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },

  breakBadge: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  breakBadgeText: {
    fontSize: 12,
    color: "#94A3B8",
  },

  locationRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 250,
  },

  locationText: {
    fontSize: 12,
    color: "#64748B",
    flexShrink: 1,
  },

  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    marginTop: 22,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#0066FF",
    borderRadius: 999,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
  },

  breakButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  breakButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B45309",
  },

  finishButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#1E3A5F",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  finishButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  breakActions: {
    gap: 12,
  },

  resumeButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#10B981",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  resumeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  finishInsteadButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  finishInsteadText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
  },

  statCard: {
    flex: 1,
    minHeight: 68,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  statValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },

  statLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
    textAlign: "center",
  },

  completeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },

  completeHeader: {
    backgroundColor: "#10B981",
    padding: 30,
    alignItems: "center",
  },

  completeIcon: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.20)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  completeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  completeSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },

  completeBody: {
    padding: 18,
    gap: 12,
  },

  infoBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    color: "#64748B",
  },

  outlineButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },

  outlineButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },

  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FFFFFF",
    color: "#334155",
    fontSize: 14,
  },

  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#1E3A5F",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  disabled: {
    opacity: 0.55,
  },
});
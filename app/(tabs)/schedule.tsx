import customFetch from "@/utils/customFetch";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import type { CreateJobForm } from "@/utils/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useRouter } from "expo-router";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

dayjs.extend(utc);

export const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// job.date comes back from the API as a full ISO datetime string
// ("2026-08-30T00:00:00.000Z"), not a plain YYYY-MM-DD one. Parsing it as
// local time risks shifting the calendar day backward for a
// negative-UTC-offset device; dayjs.utc(...) reads the date component as
// the backend actually meant it (job.date is always normalised to UTC
// midnight — see getMyJobs on the server).
function toDateKey(rawDate: string) {
  return dayjs.utc(rawDate).format("YYYY-MM-DD");
}

function normalizeJobDates(jobs: CreateJobForm[]): CreateJobForm[] {
  return jobs.map((j) => ({ ...j, date: toDateKey(j.date) }));
}

function shiftHours(job: CreateJobForm) {
  if (job.minutes) {
    return job.minutes / 60;
  }

  const diff = dayjs(`2000-01-01T${job.endTime}`).diff(
    dayjs(`2000-01-01T${job.startTime}`),
    "minute"
  );

  return Math.max(0, diff) / 60;
}

function estimatedPay(job: CreateJobForm): number | null {
  const rate = job.payRate ?? 0;
  if (!rate) return null;
  return rate * shiftHours(job);
}

function dayHeading(dateStr: string) {
  const d = dayjs(dateStr);
  const today = dayjs();

  if (d.isSame(today, "day")) {
    return "Today";
  }

  if (d.isSame(today.add(1, "day"), "day")) {
    return "Tomorrow";
  }

  return d.format("dddd, D MMMM");
}

function dateBadgeLabel(dateStr: string) {
  const d = dayjs(dateStr);
  const today = dayjs();

  if (d.isSame(today, "day")) return "Today";
  if (d.isSame(today.add(1, "day"), "day")) return "Tomorrow";
  return d.format("D MMM");
}

// A day cell's status dots, capped at the statuses this app actually has
// for a worker's own schedule — "Confirmed" covers both accepted and
// in-progress, "Cancelled" covers both cancelled and declined.
const STATUS_DOT: Record<string, string> = {
  accepted: "#3B82F6",
  "in-progress": "#3B82F6",
  pending: "#F59E0B",
  completed: "#10B981",
  cancelled: "#FB7185",
  declined: "#FB7185",
};

const DOT_LEGEND: { label: string; color: string }[] = [
  { label: "Confirmed", color: "#3B82F6" },
  { label: "Pending", color: "#F59E0B" },
  { label: "Completed", color: "#10B981" },
  { label: "Cancelled", color: "#FB7185" },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { backgroundColor: string; color: string }
  > = {
    pending: { backgroundColor: "#FEF3C7", color: "#92400E" },
    accepted: { backgroundColor: "#DBEAFE", color: "#1D4ED8" },
    "in-progress": { backgroundColor: "#DCFCE7", color: "#166534" },
    completed: { backgroundColor: "#D1FAE5", color: "#047857" },
    declined: { backgroundColor: "#E2E8F0", color: "#475569" },
    cancelled: { backgroundColor: "#FEE2E2", color: "#B91C1C" },
  };

  const badge = config[status] ?? config.pending;

  return (
    <View style={[styles.statusBadge, { backgroundColor: badge.backgroundColor }]}>
      <Text style={[styles.statusBadgeText, { color: badge.color }]}>{status}</Text>
    </View>
  );
}

function ShiftRow({ job }: { job: CreateJobForm }) {
  const router = useRouter();
  const pay = estimatedPay(job);

  return (
    <Pressable
      onPress={() => {
        if (!job._id) return;

        router.push({
          pathname: "/(tabs)/jobs/[id]",
          params: { id: job._id },
        });
      }}
      style={({ pressed }) => [styles.shiftRow, pressed && styles.shiftRowPressed]}
    >
      <View style={styles.shiftTime}>
        <Text style={styles.startTime}>{job.startTime}</Text>
        <Text style={styles.endTime}>{job.endTime}</Text>
      </View>

      <View style={styles.verticalDivider} />

      <View style={styles.shiftInfo}>
        <Text style={styles.shiftTitle} numberOfLines={1}>
          {job.title}
        </Text>
        <Text style={styles.shiftLocation} numberOfLines={1}>
          {job.location || job.client?.name}
        </Text>
      </View>

      {pay != null && <Text style={styles.payText}>£{pay.toFixed(0)}</Text>}

      <StatusBadge status={job.status ?? "pending"} />
    </Pressable>
  );
}

// Upcoming rows "jump to day" — select+scroll the calendar to that date
// instead of navigating straight to the job, so the calendar stays the one
// place a worker picks a day from (ShiftRow above still navigates straight
// to the job, since that's what tapping a shift inside the selected day
// panel should do).
function UpcomingRow({ job, onJump }: { job: CreateJobForm; onJump: () => void }) {
  const pay = estimatedPay(job);

  return (
    <Pressable
      onPress={onJump}
      style={({ pressed }) => [styles.shiftRow, pressed && styles.shiftRowPressed]}
    >
      <View style={styles.dateBadge}>
        <Text style={styles.dateBadgeText}>{dateBadgeLabel(job.date)}</Text>
      </View>

      <View style={styles.shiftInfo}>
        <Text style={styles.shiftTitle} numberOfLines={1}>
          {job.title}
        </Text>
        <Text style={styles.shiftLocation} numberOfLines={1}>
          {job.startTime}–{job.endTime}
          {job.location ? ` · ${job.location}` : ""}
        </Text>
      </View>

      {pay != null && <Text style={styles.payText}>£{pay.toFixed(0)}</Text>}

      <StatusBadge status={job.status ?? "pending"} />
    </Pressable>
  );
}

export default function ScheduleScreen() {
  const tabBarClearance = useTabBarClearance();
  const [viewedMonth, setViewedMonth] = useState(() => dayjs().startOf("month"));
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format("YYYY-MM-DD"));

  const monthStart = viewedMonth;
  const monthEnd = viewedMonth.endOf("month");

  // Scoped exactly to the viewed month — refetches on prev/next nav instead
  // of the old approach (fetch the oldest 200 assignments ever, ascending,
  // unbounded by date). A worker active long enough to have 200+ historical
  // assignments would never reach today's or future shifts that way; the
  // backend already supports start/end bounds (getMyJobs), this just uses them.
  const { data: monthData, isLoading: monthLoading, refetch: refetchMonth } = useQuery({
    queryKey: ["worker-schedule-month", monthStart.format("YYYY-MM")],
    queryFn: async () => {
      const { data } = await customFetch.get<{ jobs: CreateJobForm[] }>("/workers", {
        params: {
          start: monthStart.format("YYYY-MM-DD"),
          end: monthEnd.format("YYYY-MM-DD"),
          status: "all",
          limit: 200,
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  // Anchored to today regardless of which month the calendar is showing —
  // a separate, independently-bounded query rather than widening the month
  // query, so browsing to a distant past/future month doesn't balloon it.
  const { data: upcomingData, isLoading: upcomingLoading, refetch: refetchUpcoming } = useQuery({
    queryKey: ["worker-schedule-upcoming"],
    queryFn: async () => {
      const { data } = await customFetch.get<{ jobs: CreateJobForm[] }>("/workers", {
        params: {
          start: dayjs().format("YYYY-MM-DD"),
          status: "all",
          limit: 50,
        },
      });
      return data;
    },
  });

  // Expo Router's tab navigator keeps every tab's screen mounted in the
  // background when you switch away — it never unmounts, so React Query's
  // own refetchOnMount never gets a chance to fire again on switching back.
  // Without this, coming back to Schedule after e.g. clocking out on another
  // tab kept showing whatever was cached from the last time this screen
  // mounted, sometimes minutes or hours stale.
  useFocusEffect(
    useCallback(() => {
      refetchMonth();
      refetchUpcoming();
    }, [refetchMonth, refetchUpcoming])
  );

  const monthJobs = useMemo(() => normalizeJobDates(monthData?.jobs ?? []), [monthData]);
  const upcomingJobs = useMemo(
    () =>
      normalizeJobDates(upcomingData?.jobs ?? []).filter(
        (j) => !["completed", "cancelled", "declined"].includes(j.status ?? "")
      ),
    [upcomingData]
  );

  type GridCell = { date: Dayjs; dateStr: string; jobs: CreateJobForm[] } | null;

  const weeks = useMemo(() => {
    const leading = (monthStart.day() + 6) % 7; // 0=Mon .. 6=Sun
    const daysInMonth = monthEnd.date();
    const cells: GridCell[] = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = monthStart.date(d);
      const dateStr = date.format("YYYY-MM-DD");
      cells.push({ date, dateStr, jobs: monthJobs.filter((j) => j.date === dateStr) });
    }
    const rows: GridCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [monthStart, monthEnd, monthJobs]);

  const selectedDayJobs = useMemo(
    () =>
      monthJobs
        .filter((j) => j.date === selectedDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [monthJobs, selectedDate]
  );

  function jumpToDate(dateStr: string) {
    setSelectedDate(dateStr);
    setViewedMonth(dayjs(dateStr).startOf("month"));
  }

  const todayStr = dayjs().format("YYYY-MM-DD");

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View>
          <Text style={styles.title}>Schedule</Text>
          <Text style={styles.subtitle}>Your upcoming assignments</Text>
        </View>

        {/* Month calendar */}
        <View style={styles.monthCard}>
          <View style={styles.monthHeader}>
            <Pressable
              onPress={() => setViewedMonth((m) => m.subtract(1, "month"))}
              style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}
            >
              <ChevronLeft size={16} color="#94A3B8" />
            </Pressable>

            <Text style={styles.monthTitle}>{monthStart.format("MMMM YYYY")}</Text>

            <Pressable
              onPress={() => setViewedMonth((m) => m.add(1, "month"))}
              style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}
            >
              <ChevronRight size={16} color="#94A3B8" />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {DAY_LABELS.map((d, i) => (
              <Text key={i} style={styles.weekdayLabel}>
                {d}
              </Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.gridRow}>
              {week.map((cell, ci) => {
                if (!cell) return <View key={ci} style={styles.gridCell} />;

                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === selectedDate;
                const hasJobs = cell.jobs.length > 0;
                const statuses = [...new Set(cell.jobs.map((j) => j.status ?? ""))].slice(0, 3);

                return (
                  <Pressable
                    key={ci}
                    onPress={() => setSelectedDate(cell.dateStr)}
                    style={styles.gridCell}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isToday
                          ? styles.dayCircleToday
                          : isSelected
                            ? styles.dayCircleSelected
                            : undefined,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          isToday
                            ? styles.dayNumberToday
                            : isSelected
                              ? styles.dayNumberSelected
                              : hasJobs
                                ? styles.dayNumberActive
                                : styles.dayNumberEmpty,
                        ]}
                      >
                        {cell.date.date()}
                      </Text>
                    </View>

                    <View style={styles.dotsRow}>
                      {statuses.map((s) => (
                        <View
                          key={s}
                          style={[styles.dot, { backgroundColor: STATUS_DOT[s] ?? "#CBD5E1" }]}
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.legendRow}>
            {DOT_LEGEND.map((l) => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendLabel}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Selected day panel */}
        <View style={styles.dayPanel}>
          <Text style={styles.agendaTitle}>{dayHeading(selectedDate)}</Text>

          {monthLoading && !monthData ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator size="small" color="#1E3A5F" />
            </View>
          ) : selectedDayJobs.length === 0 ? (
            <View style={styles.emptyDayState}>
              <View style={styles.emptyIconCircle}>
                <Calendar size={18} color="#94A3B8" />
              </View>
              <Text style={styles.emptyDayText}>No shifts on this day</Text>
            </View>
          ) : (
            <View style={styles.shiftList}>
              {selectedDayJobs.map((job) => (
                <ShiftRow key={job._id} job={job} />
              ))}
            </View>
          )}
        </View>

        {/* Upcoming */}
        <View style={styles.upcomingSection}>
          <Text style={styles.agendaTitle}>Upcoming</Text>

          {upcomingLoading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator size="small" color="#1E3A5F" />
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          ) : upcomingJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No upcoming shifts scheduled</Text>
            </View>
          ) : (
            <View style={styles.shiftList}>
              {upcomingJobs.map((job) => (
                <UpcomingRow key={job._id} job={job} onJump={() => jumpToDate(job.date)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#94A3B8",
  },

  monthCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  monthTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },

  navButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  navPressed: {
    backgroundColor: "#F1F5F9",
  },

  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },

  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },

  gridRow: {
    flexDirection: "row",
  },

  gridCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 3,
    gap: 3,
  },

  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  dayCircleToday: {
    backgroundColor: "#1E3A5F",
  },

  dayCircleSelected: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  dayNumber: {
    fontSize: 12,
    fontWeight: "700",
  },

  dayNumberToday: {
    color: "#FFFFFF",
  },

  dayNumberSelected: {
    color: "#1D4ED8",
  },

  dayNumberActive: {
    color: "#0F172A",
  },

  dayNumberEmpty: {
    color: "#CBD5E1",
  },

  dotsRow: {
    flexDirection: "row",
    gap: 2,
    height: 4,
  },

  dot: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },

  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },

  legendLabel: {
    fontSize: 10,
    color: "#94A3B8",
  },

  dayPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  emptyDayState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },

  emptyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyDayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },

  upcomingSection: {
    gap: 10,
  },

  agendaTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  shiftList: {
    gap: 8,
  },

  shiftRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },

  shiftRowPressed: {
    opacity: 0.75,
  },

  shiftTime: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  startTime: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },

  endTime: {
    marginTop: 2,
    fontSize: 10,
    color: "#94A3B8",
  },

  dateBadge: {
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  dateBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155",
  },

  verticalDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#F1F5F9",
  },

  shiftInfo: {
    flex: 1,
  },

  shiftTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  shiftLocation: {
    marginTop: 3,
    fontSize: 12,
    color: "#94A3B8",
  },

  payText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  emptyCard: {
    minHeight: 120,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },

  loadingText: {
    fontSize: 13,
    color: "#94A3B8",
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },
});

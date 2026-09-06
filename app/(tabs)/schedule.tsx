import customFetch from "@/utils/customFetch";
import type { CreateJobForm } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import {
    ChevronLeft,
    ChevronRight,
    X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function startOfWeek(d: dayjs.Dayjs) {
  const day = d.day();

  const diffToMonday =
    day === 0 ? -6 : 1 - day;

  return d
    .add(diffToMonday, "day")
    .startOf("day");
}

function shiftHours(job: CreateJobForm) {
  if (job.minutes) {
    return job.minutes / 60;
  }

  const diff = dayjs(
    `2000-01-01T${job.endTime}`
  ).diff(
    dayjs(`2000-01-01T${job.startTime}`),
    "minute"
  );

  return Math.max(0, diff) / 60;
}

function dayHeading(dateStr: string) {
  const d = dayjs(dateStr);
  const today = dayjs();

  if (d.isSame(today, "day")) {
    return "Today";
  }

  if (
    d.isSame(today.add(1, "day"), "day")
  ) {
    return "Tomorrow";
  }

  return d.format("dddd, D MMMM");
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const config: Record<
    string,
    {
      backgroundColor: string;
      color: string;
    }
  > = {
    pending: {
      backgroundColor: "#FEF3C7",
      color: "#92400E",
    },

    accepted: {
      backgroundColor: "#DBEAFE",
      color: "#1D4ED8",
    },

    "in-progress": {
      backgroundColor: "#DCFCE7",
      color: "#166534",
    },

    completed: {
      backgroundColor: "#D1FAE5",
      color: "#047857",
    },

    declined: {
      backgroundColor: "#E2E8F0",
      color: "#475569",
    },

    cancelled: {
      backgroundColor: "#FEE2E2",
      color: "#B91C1C",
    },
  };

  const badge =
    config[status] ?? config.pending;

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor:
            badge.backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          {
            color: badge.color,
          },
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

function ShiftRow({
  job,
}: {
  job: CreateJobForm;
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => {
        if (!job._id) return;

        router.push({
          pathname: "/(tabs)/jobs/[id]",
          params: { id: job._id },
        });
      }}
      style={({ pressed }) => [
        styles.shiftRow,
        pressed && styles.shiftRowPressed,
      ]}
    >
      <View style={styles.shiftTime}>
        <Text style={styles.startTime}>
          {job.startTime}
        </Text>

        <Text style={styles.endTime}>
          {job.endTime}
        </Text>
      </View>

      <View style={styles.verticalDivider} />

      <View style={styles.shiftInfo}>
        <Text
          style={styles.shiftTitle}
          numberOfLines={1}
        >
          {job.title}
        </Text>

        <Text
          style={styles.shiftLocation}
          numberOfLines={1}
        >
          {job.location ||
            job.client?.name}
        </Text>
      </View>

      <StatusBadge
        status={job.status ?? "pending"}
      />
    </Pressable>
  );
}

export default function ScheduleScreen() {
  const [weekStart, setWeekStart] =
    useState(() =>
      startOfWeek(dayjs())
    );

  const [
    selectedDate,
    setSelectedDate,
  ] = useState<string | null>(null);

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ["worker-schedule"],

    queryFn: async () => {
      const { data } =
        await customFetch.get<{
          jobs: CreateJobForm[];
        }>("/workers", {
          params: {
            limit: 200,
            sort: "asc",
            status: "all",
          },
        });

      return data;
    },
  });

  const jobs = data?.jobs ?? [];

  const weekDays = useMemo(() => {
    return Array.from(
      {
        length: 7,
      },
      (_, i) => {
        const date =
          weekStart.add(i, "day");

        const dateStr =
          date.format("YYYY-MM-DD");

        const dayJobs =
          jobs.filter(
            (job) =>
              job.date === dateStr
          );

        return {
          day: DAY_LABELS[i],
          date,
          dateStr,

          isToday: date.isSame(
            dayjs(),
            "day"
          ),

          jobs: dayJobs,

          hours: dayJobs.reduce(
            (sum, job) =>
              sum +
              shiftHours(job),
            0
          ),
        };
      }
    );
  }, [weekStart, jobs]);

  const groupedUpcoming =
    useMemo(() => {
      const today =
        dayjs().format(
          "YYYY-MM-DD"
        );

      const upcoming = jobs
        .filter(
          (job) =>
            ![
              "completed",
              "cancelled",
              "declined",
            ].includes(
              job.status ?? ""
            ) &&
            job.date >= today
        )
        .sort((a, b) =>
          (
            a.date + a.startTime
          ).localeCompare(
            b.date + b.startTime
          )
        );

      const groups =
        new Map<
          string,
          CreateJobForm[]
        >();

      for (const job of upcoming) {
        if (
          !groups.has(job.date)
        ) {
          groups.set(
            job.date,
            []
          );
        }

        groups
          .get(job.date)!
          .push(job);
      }

      return [
        ...groups.entries(),
      ];
    }, [jobs]);

  const visibleGroups =
    selectedDate
      ? groupedUpcoming.filter(
          ([date]) =>
            date === selectedDate
        )
      : groupedUpcoming;

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* Header */}
        <View>
          <Text style={styles.title}>
            Schedule
          </Text>

          <Text style={styles.subtitle}>
            Your upcoming assignments
          </Text>
        </View>

        {/* Week Strip */}
        <View style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <Text
              style={styles.weekTitle}
            >
              Week of{" "}
              {weekStart.format(
                "D MMMM"
              )}
            </Text>

            <View
              style={
                styles.weekNavigation
              }
            >
              <Pressable
                onPress={() =>
                  setWeekStart((w) =>
                    w.subtract(
                      7,
                      "day"
                    )
                  )
                }
                style={({ pressed }) => [
                  styles.weekNavButton,
                  pressed &&
                    styles.navPressed,
                ]}
              >
                <ChevronLeft
                  size={16}
                  color="#94A3B8"
                />
              </Pressable>

              <Pressable
                onPress={() =>
                  setWeekStart((w) =>
                    w.add(
                      7,
                      "day"
                    )
                  )
                }
                style={({ pressed }) => [
                  styles.weekNavButton,
                  pressed &&
                    styles.navPressed,
                ]}
              >
                <ChevronRight
                  size={16}
                  color="#94A3B8"
                />
              </Pressable>
            </View>
          </View>

          <View
            style={styles.daysRow}
          >
            {weekDays.map(
              (d, i) => {
                const isSelected =
                  d.dateStr ===
                  selectedDate;

                return (
                  <Pressable
                    key={i}
                    onPress={() =>
                      setSelectedDate(
                        (selected) =>
                          selected ===
                          d.dateStr
                            ? null
                            : d.dateStr
                      )
                    }
                    style={
                      styles.dayColumn
                    }
                  >
                    <Text
                      style={
                        styles.dayLabel
                      }
                    >
                      {d.day}
                    </Text>

                    <View
                      style={[
                        styles.dayCircle,

                        isSelected
                          ? styles.dayCircleSelected
                          : d.isToday
                            ? styles.dayCircleToday
                            : d.jobs
                                  .length >
                                0
                              ? styles.dayCircleJobs
                              : styles.dayCircleEmpty,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,

                          isSelected
                            ? styles.dayNumberSelected
                            : d.isToday ||
                                d.jobs
                                  .length >
                                  0
                              ? styles.dayNumberActive
                              : styles.dayNumberEmpty,
                        ]}
                      >
                        {d.date.date()}
                      </Text>
                    </View>

                    {d.jobs.length >
                      0 && (
                      <View
                        style={
                          styles.shiftBars
                        }
                      >
                        {Array.from({
                          length:
                            Math.max(
                              1,
                              Math.ceil(
                                d.hours /
                                  8
                              )
                            ),
                        }).map(
                          (_, j) => (
                            <View
                              key={j}
                              style={[
                                styles.shiftBar,

                                isSelected
                                  ? styles.shiftBarSelected
                                  : styles.shiftBarNormal,
                              ]}
                            />
                          )
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              }
            )}
          </View>
        </View>

        {/* Agenda heading */}
        <View
          style={styles.agendaHeader}
        >
          <Text
            style={
              styles.agendaTitle
            }
          >
            {selectedDate
              ? dayHeading(
                  selectedDate
                )
              : "Upcoming Shifts"}
          </Text>

          {selectedDate && (
            <Pressable
              onPress={() =>
                setSelectedDate(null)
              }
              style={
                styles.clearButton
              }
            >
              <X
                size={13}
                color="#94A3B8"
              />

              <Text
                style={
                  styles.clearText
                }
              >
                Clear
              </Text>
            </Pressable>
          )}
        </View>

        {/* Agenda */}
        {isLoading ? (
          <View
            style={styles.emptyCard}
          >
            <ActivityIndicator
              size="small"
              color="#1E3A5F"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading…
            </Text>
          </View>
        ) : visibleGroups.length ===
          0 ? (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              {selectedDate
                ? "No shifts on this day"
                : "No upcoming shifts scheduled"}
            </Text>
          </View>
        ) : (
          <View
            style={
              styles.groupsContainer
            }
          >
            {visibleGroups.map(
              ([date, dayJobs]) => (
                <View
                  key={date}
                  style={
                    styles.dayGroup
                  }
                >
                  {!selectedDate && (
                    <Text
                      style={
                        styles.groupDate
                      }
                    >
                      {dayHeading(
                        date
                      )}
                    </Text>
                  )}

                  <View
                    style={
                      styles.shiftList
                    }
                  >
                    {dayJobs.map(
                      (job) => (
                        <ShiftRow
                          key={
                            job._id
                          }
                          job={job}
                        />
                      )
                    )}
                  </View>
                </View>
              )
            )}
          </View>
        )}
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

  weekCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 14,
  },

  weekTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },

  weekNavigation: {
    flexDirection: "row",
    gap: 4,
  },

  weekNavButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  navPressed: {
    backgroundColor: "#F1F5F9",
  },

  daysRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
  },

  dayColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },

  dayLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },

  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  dayCircleSelected: {
    backgroundColor: "#1E3A5F",
  },

  dayCircleToday: {
    backgroundColor: "#EFF6FF",
    borderWidth: 2,
    borderColor: "#BFDBFE",
  },

  dayCircleJobs: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  dayCircleEmpty: {
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  dayNumber: {
    fontSize: 12,
    fontWeight: "800",
  },

  dayNumberSelected: {
    color: "#FFFFFF",
  },

  dayNumberActive: {
    color: "#1D4ED8",
  },

  dayNumberEmpty: {
    color: "#CBD5E1",
  },

  shiftBars: {
    width: "80%",
    gap: 2,
  },

  shiftBar: {
    height: 3,
    borderRadius: 999,
  },

  shiftBarSelected: {
    backgroundColor: "#1E3A5F",
  },

  shiftBarNormal: {
    backgroundColor: "#93C5FD",
  },

  agendaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  agendaTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  clearText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },

  groupsContainer: {
    gap: 16,
  },

  dayGroup: {
    gap: 8,
  },

  groupDate: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
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
    shadowOffset: {
      width: 0,
      height: 1,
    },
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
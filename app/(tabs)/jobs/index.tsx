import CompletedJobCard from "@/components/completedJobCard"
import JobCard from "@/components/jobcard"
import customFetch from "@/utils/customFetch"
import type { MyJobsResponse, WorkerJob } from "@/utils/types"
import { useTabBarClearance } from "@/hooks/useTabBarClearance"
import { useInfiniteQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import { useFocusEffect, useRouter } from "expo-router"
import { CalendarClock, ChevronLeft, ChevronRight, Repeat2, Search, X } from "lucide-react-native"
import { useCallback, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { DAY_LABELS } from "../schedule"

function startOfWeek(d: dayjs.Dayjs) {
  const day = d.day() // 0 (Sun) .. 6 (Sat)
  const diffToMonday = day === 0 ? -6 : 1 - day
  return d.add(diffToMonday, "day").startOf("day")
}

// Same real status vocabulary as the backend/web — no mobile-only labels
// ("New"/"Upcoming"/"Active"/"Past"), and "In Progress" included, which the
// web tab set was previously missing (an active shift was invisible under
// every filter there).
const STATUS_TABS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "declined", label: "Declined" },
]

const PAGE_LIMIT = 15

function useMyJobs(params: { status: string; search: string; start: string | null; end: string | null }) {
  return useInfiniteQuery({
    queryKey: ["jobs", params],
    queryFn: async ({ pageParam }) => {
      const { data } = await customFetch.get<MyJobsResponse>("/workers", {
        params: {
          status: params.status,
          search: params.search || undefined,
          start: params.start || undefined,
          end: params.end || undefined,
          page: pageParam,
          limit: PAGE_LIMIT,
        },
      })
      return data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
  })
}

export default function JobsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tabBarClearance = useTabBarClearance()

  const [status, setStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [weekStart, setWeekStart] = useState(() => startOfWeek(dayjs()))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = weekStart.add(i, "day")
        return { day: DAY_LABELS[i], date, dateStr: date.format("YYYY-MM-DD"), isToday: date.isSame(dayjs(), "day") }
      }),
    [weekStart]
  )

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyJobs({ status, search, start: selectedDate, end: selectedDate })

  // Tab navigator keeps this screen mounted on switching away — refetch on
  // every return to the tab, not just the first mount, same fix as Home and
  // Schedule.
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  const jobs: WorkerJob[] = data?.pages.flatMap((p) => p.jobs) ?? []
  const total = data?.pages[0]?.total ?? 0

  return (
    <View style={[styles.screen, { paddingTop: insets.top > 0 ? insets.top + 10 : 16 }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Jobs</Text>
        </View>

        <View style={styles.linkRow}>
          <Pressable style={styles.openShiftsLink} onPress={() => router.push("/(tabs)/jobs/open-shifts")}>
            <CalendarClock size={14} color="#1E3A5F" />
            <Text style={styles.openShiftsLinkText}>Open shifts</Text>
            <ChevronRight size={14} color="#1E3A5F" />
          </Pressable>

          <Pressable style={styles.openShiftsLink} onPress={() => router.push("/(tabs)/jobs/recurring")}>
            <Repeat2 size={14} color="#1E3A5F" />
            <Text style={styles.openShiftsLinkText}>Recurring</Text>
            <ChevronRight size={14} color="#1E3A5F" />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Search size={15} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search jobs"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <X size={15} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#1E3A5F" />}
      >
        {/* Date filter — same week-strip pattern as the Schedule screen */}
        <View style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <Text style={styles.weekTitle}>Week of {weekStart.format("D MMMM")}</Text>
            <View style={styles.weekNav}>
              {selectedDate && (
                <Pressable onPress={() => setSelectedDate(null)} style={styles.clearChip} hitSlop={6}>
                  <X size={11} color="#94A3B8" />
                  <Text style={styles.clearChipText}>Clear</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setWeekStart((w) => w.subtract(7, "day"))}
                style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}
              >
                <ChevronLeft size={14} color="#94A3B8" />
              </Pressable>
              <Pressable
                onPress={() => setWeekStart((w) => w.add(7, "day"))}
                style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}
              >
                <ChevronRight size={14} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          <View style={styles.daysRow}>
            {weekDays.map((d, i) => {
              const isSelected = d.dateStr === selectedDate
              return (
                <Pressable
                  key={i}
                  onPress={() => setSelectedDate((sel) => (sel === d.dateStr ? null : d.dateStr))}
                  style={styles.dayColumn}
                >
                  <Text style={styles.dayLabel}>{d.day}</Text>
                  <View
                    style={[
                      styles.dayCircle,
                      isSelected ? styles.dayCircleSelected : d.isToday ? styles.dayCircleToday : styles.dayCircleEmpty,
                    ]}
                  >
                    <Text style={[styles.dayNumber, isSelected ? styles.dayNumberSelected : styles.dayNumberDefault]}>
                      {d.date.date()}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Status tabs */}
        <Text style={styles.filterLabel}>Filter Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {STATUS_TABS.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setStatus(t.id)}
                style={[styles.filterChip, status === t.id && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, status === t.id && styles.filterChipTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Job list */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#1E3A5F" />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Couldn&apos;t load your jobs.</Text>
            <Pressable style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : jobs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No {status === "all" ? "" : `${STATUS_TABS.find((t) => t.id === status)?.label.toLowerCase()} `}jobs
              {search ? ` matching "${search}"` : ""}.
            </Text>
          </View>
        ) : (
          <View style={styles.jobList}>
            {jobs.map((job) =>
              job.status === "completed" ? (
                <CompletedJobCard key={job._id} {...job} />
              ) : (
                <JobCard key={job._id} {...job} />
              )
            )}

            {total > jobs.length && (
              <Pressable
                style={styles.loadMoreButton}
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage || !hasNextPage}
              >
                {isFetchingNextPage ? (
                  <ActivityIndicator size="small" color="#1E3A5F" />
                ) : (
                  <Text style={styles.loadMoreText}>
                    Load more ({jobs.length} of {total})
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },

  linkRow: {
    flexDirection: "row",
    gap: 8,
  },

  openShiftsLink: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  openShiftsLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E3A5F",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    padding: 0,
  },

  content: {
    padding: 16,
    paddingTop: 12,
    gap: 12,
    flexGrow: 1,
  },

  weekCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
  },

  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  weekTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },

  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  clearChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    height: 26,
    borderRadius: 8,
    marginRight: 2,
  },

  clearChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },

  navButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  navPressed: {
    backgroundColor: "#F1F5F9",
  },

  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    width: 32,
    height: 32,
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

  dayNumberDefault: {
    color: "#334155",
  },

  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },

  filterScroll: {
    flexGrow: 0,
  },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },

  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  filterChipActive: {
    backgroundColor: "#1E3A5F",
    borderColor: "#1E3A5F",
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  jobList: {
    gap: 12,
  },

  loadMoreButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  loadMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A5F",
  },

  empty: {
    marginTop: 40,
    alignItems: "center",
    gap: 12,
  },

  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    paddingHorizontal: 24,
  },

  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1E3A5F",
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
})

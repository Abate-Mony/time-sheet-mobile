import JobCard from "@/components/jobcard"
import customFetch from "@/utils/customFetch"
import type { MyJobsResponse } from "@/utils/types"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { CalendarClock, ChevronRight, Repeat2 } from "lucide-react-native"
import { useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const FILTERS = [
  { key: "pending", label: "New" },
  { key: "accepted", label: "Upcoming" },
  { key: "in-progress", label: "Active" },
  { key: "completed", label: "Past" },
] as const

type FilterKey = (typeof FILTERS)[number]["key"]

function useMyJobs(status: FilterKey) {
  return useQuery({
    queryKey: ["jobs", status],
    queryFn: async () => {
      const { data } = await customFetch.get<MyJobsResponse>("/workers", {
        params: { status, limit: 50 },
      })
      return data.jobs
    },
  })
}

export default function JobsScreen() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>("pending")

  const { data: jobs, isLoading, isError, refetch, isRefetching } = useMyJobs(filter)

  return (
    <SafeAreaView style={styles.screen}>
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
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#1E3A5F" />}
      >
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#1E3A5F" />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Couldn&apos;t load your jobs.</Text>
            <Pressable style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : !jobs || jobs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nothing here yet.</Text>
          </View>
        ) : (
          jobs.map(job => (
        <JobCard
        {
          ...job
        }
        key={job._id}
        
        />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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

  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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

  content: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
    flexGrow: 1,
  },

  empty: {
    marginTop: 40,
    alignItems: "center",
    gap: 12,
  },

  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
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

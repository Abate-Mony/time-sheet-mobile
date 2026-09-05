import { changeWorkerJobStaus } from "@/utils/api-request-functions"
import customFetch from "@/utils/customFetch"
import { formatDate } from "@/utils/date"
import type { MyJobsResponse, WorkerJob } from "@/utils/types"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { Calendar, ChevronRight, Clock as ClockIcon, MapPin } from "lucide-react-native"
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
  const [actingOn, setActingOn] = useState<string | null>(null)

  const { data: jobs, isLoading, isError, refetch, isRefetching } = useMyJobs(filter)

  const act = async (job: WorkerJob, status: "accepted" | "declined" | "in-progress") => {
    setActingOn(job._id)
    const result = await changeWorkerJobStaus(job._id, status)
    setActingOn(null)
    if (result.success && status === "in-progress") {
      router.push("/(tabs)/clock")
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>My Jobs</Text>
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
            <Pressable
              key={job._id}
              style={styles.card}
              onPress={() => router.push({ pathname: "/job/[id]", params: { id: job._id } })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.jobTitle} numberOfLines={1}>
                  {job.title}
                </Text>
                <ChevronRight size={16} color="#94A3B8" />
              </View>

              <View style={styles.metaRow}>
                <Calendar size={13} color="#64748B" />
                <Text style={styles.metaText}>{formatDate(job.date)}</Text>
              </View>
              <View style={styles.metaRow}>
                <ClockIcon size={13} color="#64748B" />
                <Text style={styles.metaText}>
                  {job.startTime}–{job.endTime}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <MapPin size={13} color="#64748B" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {job.location}
                </Text>
              </View>

              {job.status === "pending" && (
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.declineButton, actingOn === job._id && styles.disabled]}
                    disabled={actingOn === job._id}
                    onPress={() => act(job, "declined")}
                  >
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.acceptButton, actingOn === job._id && styles.disabled]}
                    disabled={actingOn === job._id}
                    onPress={() => act(job, "accepted")}
                  >
                    {actingOn === job._id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    )}
                  </Pressable>
                </View>
              )}

              {job.status === "accepted" && (
                <Pressable
                  style={[styles.startButton, actingOn === job._id && styles.disabled]}
                  disabled={actingOn === job._id}
                  onPress={() => act(job, "in-progress")}
                >
                  {actingOn === job._id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.startButtonText}>Start Job</Text>
                  )}
                </Pressable>
              )}

              {job.status === "in-progress" && (
                <Pressable style={styles.startButton} onPress={() => router.push("/(tabs)/clock")}>
                  <Text style={styles.startButtonText}>Continue</Text>
                </Pressable>
              )}
            </Pressable>
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
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
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

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 6,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  jobTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metaText: {
    fontSize: 12,
    color: "#64748B",
    flexShrink: 1,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  declineButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  declineButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },

  acceptButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
  },

  acceptButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  startButton: {
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  startButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  disabled: {
    opacity: 0.6,
  },
})

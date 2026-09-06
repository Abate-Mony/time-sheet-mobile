import { RecurringAssignmentCard } from "@/components/RecurringAssignmentCard"
import customFetch from "@/utils/customFetch"
import { describeRecurrence, type Frequency } from "@/utils/recurring"
import type { WorkerRecurringGroup } from "@/utils/types"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { Repeat2 } from "lucide-react-native"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

interface RawRecurringGroup {
  recurringJobId: string
  title: string
  location?: string
  client?: string
  frequency: Frequency
  interval: number
  daysOfWeek?: number[]
  startTime: string
  endTime: string
  pendingCount: number
  acceptedCount: number
  declinedCount: number
  upcomingCount: number
  nextShift: { jobId: string; assignmentId: string; date: string; startTime: string; endTime: string } | null
  shifts: WorkerRecurringGroup["shifts"]
}

function useRecurringGroups() {
  return useQuery({
    queryKey: ["worker-recurring-groups"],
    queryFn: async (): Promise<WorkerRecurringGroup[]> => {
      const { data } = await customFetch.get<{ groups: RawRecurringGroup[] }>("/workers/recurring-groups")
      return data.groups.map(g => ({
        recurringJobId: g.recurringJobId,
        title: g.title,
        location: g.location,
        client: g.client,
        recurrenceLabel: describeRecurrence(g),
        startTime: g.startTime,
        endTime: g.endTime,
        pendingCount: g.pendingCount,
        acceptedCount: g.acceptedCount,
        declinedCount: g.declinedCount,
        upcomingCount: g.upcomingCount,
        nextShift: g.nextShift ?? undefined,
        shifts: g.shifts,
      }))
    },
  })
}

export default function RecurringAssignmentsScreen() {
  const router = useRouter()
  const { data: groups, isLoading, isError, refetch, isRefetching } = useRecurringGroups()

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Recurring Shifts</Text>
        <Text style={styles.subtitle}>Respond to your recurring assignments in bulk</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#1E3A5F" />}
      >
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#1E3A5F" />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Couldn&apos;t load recurring shifts</Text>
            <Pressable style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : !groups || groups.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Repeat2 size={22} color="#1E3A5F" />
            </View>
            <Text style={styles.emptyTitle}>No recurring shifts</Text>
            <Text style={styles.emptyText}>
              Recurring shifts you&apos;re assigned to will show up here so you can respond to them in bulk.
            </Text>
          </View>
        ) : (
          groups.map(group => <RecurringAssignmentCard key={group.recurringJobId} group={group} />)
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
    gap: 4,
  },

  backText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },

  subtitle: {
    fontSize: 12,
    color: "#94A3B8",
  },

  content: {
    padding: 16,
    paddingTop: 12,
    gap: 16,
    flexGrow: 1,
  },

  empty: {
    marginTop: 40,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
  },

  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(30,58,95,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
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

import { changeWorkerJobStaus } from "@/utils/api-request-functions"
import customFetch from "@/utils/customFetch"
import { formatDate } from "@/utils/date"
import type { SingleJobResponse } from "@/utils/types"
import { useQuery } from "@tanstack/react-query"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { Banknote, Calendar, Clock as ClockIcon, MapPin } from "lucide-react-native"
import { useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [acting, setActing] = useState(false)

  const { data: job, isLoading, isError, refetch } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data } = await customFetch.get<SingleJobResponse>(`/workers/${id}`)
      return data.job
    },
    enabled: !!id,
  })

  const act = async (status: "accepted" | "declined" | "in-progress") => {
    if (!id) return
    setActing(true)
    const result = await changeWorkerJobStaus(id, status)
    setActing(false)
    if (result.success) {
      if (status === "in-progress") {
        router.replace("/(tabs)/clock")
      } else {
        router.back()
      }
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <Stack.Screen options={{ title: job?.title ?? "Job Details" }} />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#1E3A5F" />
      ) : isError || !job ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Couldn&apos;t load this job.</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{job.title}</Text>

          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Calendar size={15} color="#64748B" />
              <Text style={styles.metaText}>{formatDate(job.date)}</Text>
            </View>
            <View style={styles.metaRow}>
              <ClockIcon size={15} color="#64748B" />
              <Text style={styles.metaText}>
                {job.startTime}–{job.endTime}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={15} color="#64748B" />
              <Text style={styles.metaText}>{job.address || job.location}</Text>
            </View>
            {!!job.payRate && (
              <View style={styles.metaRow}>
                <Banknote size={15} color="#64748B" />
                <Text style={styles.metaText}>£{job.payRate}/hr</Text>
              </View>
            )}
          </View>

          {!!job.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.sectionBody}>{job.description}</Text>
            </View>
          )}

          {!!job.instructions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <Text style={styles.sectionBody}>{job.instructions}</Text>
            </View>
          )}

          {job.status === "pending" && (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.declineButton, acting && styles.disabled]}
                disabled={acting}
                onPress={() => act("declined")}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </Pressable>
              <Pressable
                style={[styles.acceptButton, acting && styles.disabled]}
                disabled={acting}
                onPress={() => act("accepted")}
              >
                {acting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.acceptButtonText}>Accept</Text>
                )}
              </Pressable>
            </View>
          )}

          {job.status === "accepted" && (
            <Pressable
              style={[styles.startButton, acting && styles.disabled]}
              disabled={acting}
              onPress={() => act("in-progress")}
            >
              {acting ? (
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
        </ScrollView>
      )}
    </SafeAreaView>
  )
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

  empty: {
    marginTop: 60,
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

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },

  metaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 10,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  metaText: {
    fontSize: 13,
    color: "#334155",
    flexShrink: 1,
  },

  section: {
    gap: 6,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  sectionBody: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },

  declineButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  declineButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },

  acceptButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
  },

  acceptButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  startButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
  },

  startButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  disabled: {
    opacity: 0.6,
  },
})

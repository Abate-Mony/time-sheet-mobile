import { changeWorkerJobStaus } from "@/utils/api-request-functions";
import customFetch from "@/utils/customFetch";
import { formatDate, formatDuration } from "@/utils/date";
import { buildMapUrl, MAP_SERVICES, type MapService } from "@/utils/mapLinks";
import type { SingleJobResponse } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Dot,
  MapPin,
  Navigation,
  Timer,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PREFERRED_MAP_STORAGE_KEY = "preferredMapService";

// Apple Maps' web fallback (maps.apple.com) is a real navigation handoff on
// iOS but just opens a webpage on Android — not worth offering there.
const AVAILABLE_MAP_SERVICES =
  Platform.OS === "android" ? MAP_SERVICES.filter(s => s.id !== "apple") : MAP_SERVICES;

type LoadingAction = "accept" | "reject" | "start" | null;

const STATUS_STYLES = {
  pending: { bg: "#FEF3C7", text: "#92400E" },
  accepted: { bg: "#DBEAFE", text: "#1D4ED8" },
  "in-progress": { bg: "#DCFCE7", text: "#166534" },
  completed: { bg: "#D1FAE5", text: "#047857" },
  declined: { bg: "#E2E8F0", text: "#475569" },
} as const;

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [preferredMap, setPreferredMap] = useState<MapService>("google");

  useEffect(() => {
    SecureStore.getItemAsync(PREFERRED_MAP_STORAGE_KEY).then(saved => {
      if (saved) setPreferredMap(saved as MapService);
    });
  }, []);

  const chooseMapService = (service: MapService) => {
    setPreferredMap(service);
    SecureStore.setItemAsync(PREFERRED_MAP_STORAGE_KEY, service);
  };

  const { data: job, isLoading, isError, refetch } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data } = await customFetch.get<SingleJobResponse>(`/workers/${id}`);
      return data.job;
    },
    enabled: !!id,
  });

  const act = async (status: "accepted" | "declined" | "in-progress") => {
    if (!id) return;

    const action: LoadingAction =
      status === "accepted" ? "accept" : status === "declined" ? "reject" : "start";

    setLoadingAction(action);

    try {
      const result = await changeWorkerJobStaus(id, status);
      if (!result.success) return;

      if (status === "in-progress") {
        router.replace("/(tabs)/clock");
      } else {
        await refetch();
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const heroColor = useMemo(() => {
    if (job?.status === "completed") return "#10B981";
    if (job?.status === "declined") return "#64748B";
    return "#1E3A5F";
  }, [job?.status]);

  const infoRows = job
    ? [
      {
        icon: Timer,
        label: "Duration",
        value:
          job.minutes != null
            ? formatDuration(job.minutes)
            : `${job.startTime}–${job.endTime}`,
      },
      {
        icon: MapPin,
        label: "Location",
        value: job.address || job.location,
      },
      {
        icon: CalendarDays,
        label: "Date",
        value: formatDate(job.date),
      },
    ]
    : [];

  const directionsHref = buildMapUrl(preferredMap, {
    lat: job?.coordinates?.lat,
    lng: job?.coordinates?.lng,
    address: job?.address || job?.location,
  });

  // The job's over either way — no reason to keep offering directions to it.
  const showDirections = !!directionsHref && job?.status !== "completed" && job?.status !== "declined";

  const openDirections = () => {
    if (directionsHref) Linking.openURL(directionsHref);
  };

  const statusStyle =
    STATUS_STYLES[(job?.status as keyof typeof STATUS_STYLES) ?? "pending"] ??
    STATUS_STYLES.pending;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E3A5F" />
        </View>
      ) : isError || !job ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Couldn&apos;t load this job.</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={17} color="#64748B" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.heroCard}>
            <View style={[styles.heroTop, { backgroundColor: heroColor }]}>
              <View style={styles.heroHeaderRow}>
                <View style={styles.heroTitleWrap}>
                  {!!job?.client?.name && (
                    <Text style={styles.clientName}>{job.client.name.toUpperCase()}</Text>
                  )}
                  <Text style={styles.heroTitle}>{job.title}</Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                    {job.status}
                  </Text>
                </View>
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timePill}>
                  <Clock size={13} color="#CBD5E1" />
                  <Text style={styles.timeText}>{job.startTime}</Text>
                </View>

                <View style={styles.timeDivider} />

                <View style={styles.timePill}>
                  <Clock size={13} color="#CBD5E1" />
                  <Text style={styles.timeText}>{job.endTime}</Text>
                </View>

                {!!job.priority && (
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>{job.priority}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.infoList}>
              {infoRows.map((row, index) => {
                const Icon = row.icon;
                return (
                  <View
                    key={row.label}
                    style={[styles.infoRow, index < infoRows.length - 1 && styles.infoRowBorder]}
                  >
                    <View style={styles.infoIcon}>
                      <Icon size={15} color="#64748B" />
                    </View>
                    <View style={styles.infoTextWrap}>
                      <Text style={styles.infoLabel}>{row.label.toUpperCase()}</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        {row.value || "—"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {!!job.description && (
            <View style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <AlertCircle size={15} color="#D97706" />
                <Text style={styles.noteTitle}>MANAGER NOTE</Text>
              </View>
              <Text style={styles.noteBody}>{job.description}</Text>
            </View>
          )}

          {!!job.instructions && (
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>INSTRUCTIONS</Text>
              <Text style={styles.instructionsBody}>{job.instructions}</Text>
            </View>
          )}

          {job.status === "completed" && (
            <View style={styles.completedCard}>
              <View style={styles.completedIcon}>
                <CheckCircle2 size={17} color="#059669" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.completedTitle}>Shift completed</Text>
                <Text style={styles.completedBody}>
                  Your hours have been recorded and sent to your manager.
                </Text>
              </View>
            </View>
          )}

          {job.status === "declined" && (
            <View style={styles.declinedCard}>
              <View style={styles.declinedIcon}>
                <X size={17} color="#64748B" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.declinedTitle}>You declined this shift</Text>
                <Text style={styles.declinedBody}>This job is no longer assigned to you.</Text>
              </View>
            </View>
          )}

          {job.status === "pending" && (
            <View style={styles.actionRow}>
              <Pressable
                disabled={loadingAction !== null}
                onPress={() => act("declined")}
                style={[styles.declineButton, loadingAction !== null && styles.disabled]}
              >
                {loadingAction === "reject" ? (
                  <ActivityIndicator size="small" color="#64748B" />
                ) : (
                  <>
                    <X size={15} color="#64748B" />
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                disabled={loadingAction !== null}
                onPress={() => act("accepted")}
                style={[styles.acceptButton, loadingAction !== null && styles.disabled]}
              >
                {loadingAction === "accept" ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={15} color="#FFFFFF" />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {job.status === "accepted" && (
            <Pressable
              disabled={loadingAction !== null}
              onPress={() => act("in-progress")}
              style={[styles.startButton, loadingAction !== null && styles.disabled]}
            >
              {loadingAction === "start" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Timer size={15} color="#FFFFFF" />
                  <Text style={styles.startButtonText}>Start Working Job</Text>
                </>
              )}
            </Pressable>
          )}

          {job.status === "in-progress" && (
            <Pressable style={styles.liveButton} onPress={() => router.push("/(tabs)/clock")}>
              <Dot size={34} color="#4ADE80" />
              <Text style={styles.liveButtonText}>Job Live</Text>
            </Pressable>
          )}

          {showDirections && (
            <View style={styles.directionsWrap}>
              <Pressable style={styles.directionsButton} onPress={openDirections}>
                <Navigation size={16} color="#64748B" />
                <Text style={styles.directionsText}>
                  Get Directions via {MAP_SERVICES.find(s => s.id === preferredMap)?.label}
                </Text>
              </Pressable>

              <View style={styles.mapServiceRow}>
                {AVAILABLE_MAP_SERVICES.map(service => (
                  <Pressable
                    key={service.id}
                    onPress={() => chooseMapService(service.id)}
                    style={[styles.mapServiceChip, preferredMap === service.id && styles.mapServiceChipActive]}
                  >
                    <Text
                      style={[
                        styles.mapServiceChipText,
                        preferredMap === service.id && styles.mapServiceChipTextActive,
                      ]}
                    >
                      {service.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  backButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 3 },
  backText: { color: "#64748B", fontSize: 14, fontWeight: "600" },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  heroTop: { padding: 20 },
  heroHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroTitleWrap: { flex: 1 },
  clientName: { color: "rgba(255,255,255,0.52)", fontSize: 10, fontWeight: "700", letterSpacing: 1.3, marginBottom: 6 },
  heroTitle: { color: "#FFFFFF", fontSize: 17, lineHeight: 23, fontWeight: "800" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusBadgeText: { fontSize: 10, fontWeight: "800", textTransform: "capitalize" },
  timeRow: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  timePill: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.10)" },
  timeText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  timeDivider: { width: 24, height: 1, backgroundColor: "rgba(255,255,255,0.22)" },
  priorityBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)" },
  priorityText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  infoList: { paddingHorizontal: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  infoIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "700", letterSpacing: 0.5 },
  infoValue: { marginTop: 2, fontSize: 14, color: "#1E293B", fontWeight: "600" },
  noteCard: { padding: 16, borderRadius: 16, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  noteHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  noteTitle: { color: "#92400E", fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  noteBody: { color: "#92400E", fontSize: 14, lineHeight: 20 },
  instructionsCard: { padding: 16, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  instructionsTitle: { color: "#94A3B8", fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginBottom: 7 },
  instructionsBody: { color: "#334155", fontSize: 14, lineHeight: 20 },
  completedCard: { backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  completedIcon: { width: 34, height: 34, borderRadius: 999, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center" },
  completedTitle: { color: "#065F46", fontWeight: "800", fontSize: 14 },
  completedBody: { marginTop: 3, color: "#047857", fontSize: 12, lineHeight: 17 },
  declinedCard: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  declinedIcon: { width: 34, height: 34, borderRadius: 999, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  declinedTitle: { color: "#334155", fontWeight: "800", fontSize: 14 },
  declinedBody: { marginTop: 3, color: "#64748B", fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 10 },
  declineButton: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  declineButtonText: { color: "#64748B", fontSize: 14, fontWeight: "700" },
  acceptButton: { flex: 1, height: 46, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  acceptButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  startButton: { height: 46, borderRadius: 12, backgroundColor: "#1B7B3D", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  startButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  liveButton: { height: 46, borderRadius: 12, backgroundColor: "#1E3A5F", alignItems: "center", justifyContent: "center", flexDirection: "row" },
  liveButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", marginLeft: -7 },
  directionsWrap: { gap: 8 },
  directionsButton: { height: 46, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  directionsText: { color: "#334155", fontSize: 14, fontWeight: "700" },
  mapServiceRow: { flexDirection: "row", justifyContent: "center", gap: 6 },
  mapServiceChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  mapServiceChipActive: { backgroundColor: "#1E293B" },
  mapServiceChipText: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },
  mapServiceChipTextActive: { color: "#FFFFFF" },
  retryButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: "#1E3A5F" },
  retryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  emptyText: { color: "#94A3B8", fontSize: 14 },
  disabled: { opacity: 0.55 },
  flex1: { flex: 1 },
});

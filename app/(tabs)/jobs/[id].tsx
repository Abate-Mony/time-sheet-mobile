import { useShiftStartGate } from "@/hooks/shiftgate";
import { useCompanyPlan } from "@/hooks/useCompanyPlan";
import { changeWorkerJobStaus, toggleChecklistItem } from "@/utils/api-request-functions";
import customFetch from "@/utils/customFetch";
import { formatDate, formatDuration, formatTimeUntil } from "@/utils/date";
import { buildMapUrl, MAP_SERVICES, type MapService } from "@/utils/mapLinks";
import type { SingleJobResponse } from "@/utils/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  Dot,
  ListChecks,
  MapPin,
  Navigation,
  Paperclip,
  RefreshCw,
  Timer,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  cancelled: { bg: "#FEE2E2", text: "#B91C1C" },
} as const;

// Shared shape for the Cancel and Release confirmation sheets — same
// pattern as jobcard.tsx's decline modal, matching web's Drawer dialogs.
function ReasonSheet({
  visible,
  title,
  description,
  noteBox,
  reason,
  onReasonChange,
  confirmLabel,
  confirmColor,
  loading,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  description: string;
  noteBox: { icon: ReactNode; text: string; bg: string; border: string; color: string };
  reason: string;
  onReasonChange: (v: string) => void;
  confirmLabel: string;
  confirmColor: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalSubtitle}>{description}</Text>

          <Text style={styles.modalLabel}>
            Reason <Text style={styles.modalLabelOptional}>(optional)</Text>
          </Text>
          <TextInput
            value={reason}
            onChangeText={t => onReasonChange(t.slice(0, 300))}
            placeholder="e.g. I'm unwell, transport issue, personal emergency..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            style={styles.modalTextarea}
            editable={!loading}
          />
          <Text style={styles.modalCharCount}>{reason.length}/300</Text>

          <View style={[styles.noteBox, { backgroundColor: noteBox.bg, borderColor: noteBox.border }]}>
            {noteBox.icon}
            <Text style={[styles.noteBoxText, { color: noteBox.color }]}>{noteBox.text}</Text>
          </View>

          <View style={styles.modalActions}>
            <Pressable style={[styles.modalKeepButton, loading && styles.disabled]} disabled={loading} onPress={onCancel}>
              <Text style={styles.modalKeepButtonText}>Keep shift</Text>
            </Pressable>
            <Pressable
              style={[styles.modalConfirmButton, { backgroundColor: confirmColor }, loading && styles.disabled]}
              disabled={loading}
              onPress={onConfirm}
            >
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmButtonText}>{confirmLabel}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [preferredMap, setPreferredMap] = useState<MapService>("google");

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseReason, setReleaseReason] = useState("");
  const [isReleasing, setIsReleasing] = useState(false);

  const { hasFeature } = useCompanyPlan();
  const canRelease = hasFeature("openShifts");

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

  const { canStart, minutesUntilStart, hasExpired } = useShiftStartGate(job?.date, job?.startTime, job?.endTime);

  const checklistMutation = useMutation({
    mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) => toggleChecklistItem(id!, itemId, done),
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

  const confirmCancel = async () => {
    if (!id) return;
    setIsCancelling(true);
    const result = await changeWorkerJobStaus(id, "cancelled", { reason: cancelReason.trim() || undefined });
    setIsCancelling(false);
    if (result.success) {
      setCancelReason("");
      setShowCancelModal(false);
      await refetch();
    }
  };

  const confirmRelease = async () => {
    if (!id) return;
    setIsReleasing(true);
    const result = await changeWorkerJobStaus(id, "cancelled", {
      reason: releaseReason.trim() || undefined,
      release: true,
    });
    setIsReleasing(false);
    if (result.success) {
      setReleaseReason("");
      setShowReleaseModal(false);
      await refetch();
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

  const showSiteSnapshot =
    !!job?.siteSnapshot &&
    !!(job.siteSnapshot.contact?.name || job.siteSnapshot.accessInstructions || job.siteSnapshot.parkingInstructions);

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

          {!!job.checklist && job.checklist.length > 0 && (
            <View style={styles.instructionsCard}>
              <View style={styles.checklistHeader}>
                <ListChecks size={13} color="#64748B" />
                <Text style={styles.instructionsTitle}>
                  CHECKLIST · {job.checklist.filter(i => i.done).length}/{job.checklist.length}
                </Text>
              </View>
              {job.checklist.map((item, i) => (
                <Pressable
                  key={item._id ?? i}
                  disabled={!item._id || checklistMutation.isPending}
                  onPress={() => item._id && checklistMutation.mutate({ itemId: item._id, done: !item.done })}
                  style={styles.checklistRow}
                >
                  {item.done ? (
                    <CheckCircle2 size={18} color="#059669" />
                  ) : (
                    <Circle size={18} color="#CBD5E1" />
                  )}
                  <Text style={[styles.checklistText, item.done && styles.checklistTextDone]}>{item.text}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {!!job.attachment && (
            <Pressable style={styles.attachmentCard} onPress={() => Linking.openURL(job.attachment!.url)}>
              <Paperclip size={15} color="#64748B" />
              <View style={styles.flex1}>
                <Text style={styles.attachmentLabel}>ATTACHMENT</Text>
                <Text style={styles.attachmentFilename} numberOfLines={1}>
                  {job.attachment.filename}
                </Text>
              </View>
            </Pressable>
          )}

          {showSiteSnapshot && (
            <View style={styles.siteCard}>
              {job.siteSnapshot?.contact?.name && (
                <View>
                  <Text style={styles.siteLabel}>SITE CONTACT</Text>
                  <Text style={styles.siteContactName}>{job.siteSnapshot.contact.name}</Text>
                  {job.siteSnapshot.contact.phone && (
                    <Pressable onPress={() => Linking.openURL(`tel:${job.siteSnapshot!.contact!.phone}`)}>
                      <Text style={styles.siteContactPhone}>{job.siteSnapshot.contact.phone}</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {job.siteSnapshot?.accessInstructions && (
                <View>
                  <Text style={styles.siteLabel}>ACCESS INSTRUCTIONS</Text>
                  <Text style={styles.siteBody}>{job.siteSnapshot.accessInstructions}</Text>
                </View>
              )}
              {job.siteSnapshot?.parkingInstructions && (
                <View>
                  <Text style={styles.siteLabel}>PARKING</Text>
                  <Text style={styles.siteBody}>{job.siteSnapshot.parkingInstructions}</Text>
                </View>
              )}
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

          {job.status === "cancelled" && (
            <View style={styles.declinedCard}>
              <View style={styles.declinedIcon}>
                <X size={17} color="#64748B" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.declinedTitle}>You cancelled this shift</Text>
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

          {job.status === "in-progress" && (
            <Pressable style={styles.liveButton} onPress={() => router.push("/(tabs)/clock")}>
              <Dot size={34} color="#4ADE80" />
              <Text style={styles.liveButtonText}>Job Live</Text>
            </Pressable>
          )}

          {job.status === "accepted" && (
            canStart ? (
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
            ) : (
              <View style={styles.waitBox}>
                <Timer size={14} color={hasExpired ? "#B91C1C" : "#94A3B8"} />
                <Text style={[styles.waitText, hasExpired && styles.waitTextExpired]}>
                  {hasExpired ? "Shift window missed" : `Starts in ${formatTimeUntil(minutesUntilStart ?? 0)}`}
                </Text>
              </View>
            )
          )}

          {job.status === "accepted" && !hasExpired && canRelease && (
            <Pressable style={styles.releaseButton} onPress={() => setShowReleaseModal(true)}>
              <Text style={styles.releaseButtonText}>Release Shift</Text>
            </Pressable>
          )}

          {job.status === "accepted" && !hasExpired && (
            <Pressable style={styles.cancelShiftButton} onPress={() => setShowCancelModal(true)}>
              <Text style={styles.cancelShiftButtonText}>Cancel Shift</Text>
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

      {job && (
        <>
          <ReasonSheet
            visible={showCancelModal}
            title="Cancel shift"
            description="If you can no longer work this shift, you can cancel it here. Your manager will be notified."
            noteBox={{
              icon: <AlertTriangle size={16} color="#D97706" style={{ marginTop: 1 }} />,
              text: "Cancelling this shift will remove you from the assignment. Your manager will be notified and may need to find a replacement.",
              bg: "#FFFBEB",
              border: "#FDE68A",
              color: "#92400E",
            }}
            reason={cancelReason}
            onReasonChange={setCancelReason}
            confirmLabel="Cancel shift"
            confirmColor="#E11D48"
            loading={isCancelling}
            onCancel={() => setShowCancelModal(false)}
            onConfirm={confirmCancel}
          />

          <ReasonSheet
            visible={showReleaseModal}
            title="Release shift"
            description="Can't work this shift? Release it and it goes straight into open shifts for another worker to pick up — no need to wait on your manager."
            noteBox={{
              icon: <RefreshCw size={16} color="#2563EB" style={{ marginTop: 1 }} />,
              text: "You'll be removed from this shift and it becomes an open shift for any eligible worker to claim. Your manager is notified either way.",
              bg: "#EFF6FF",
              border: "#BFDBFE",
              color: "#1E40AF",
            }}
            reason={releaseReason}
            onReasonChange={setReleaseReason}
            confirmLabel="Release shift"
            confirmColor="#1E3A5F"
            loading={isReleasing}
            onCancel={() => setShowReleaseModal(false)}
            onConfirm={confirmRelease}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F5F5" },
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
  checklistHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  checklistText: { flex: 1, color: "#334155", fontSize: 14 },
  checklistTextDone: { color: "#94A3B8", textDecorationLine: "line-through" },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  attachmentLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "700", letterSpacing: 0.5 },
  attachmentFilename: { marginTop: 2, fontSize: 14, color: "#1E293B", fontWeight: "600", textDecorationLine: "underline" },
  siteCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  siteLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 },
  siteContactName: { fontSize: 14, color: "#1E293B", fontWeight: "600" },
  siteContactPhone: { marginTop: 2, fontSize: 12, color: "#64748B" },
  siteBody: { fontSize: 14, color: "#334155", lineHeight: 20 },
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
  waitBox: { height: 46, borderRadius: 12, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  waitText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  waitTextExpired: { color: "#B91C1C" },
  liveButton: { height: 46, borderRadius: 12, backgroundColor: "#1E3A5F", alignItems: "center", justifyContent: "center", flexDirection: "row" },
  liveButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", marginLeft: -7 },
  releaseButton: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  releaseButtonText: { color: "#1D4ED8", fontSize: 14, fontWeight: "700" },
  cancelShiftButton: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB", alignItems: "center", justifyContent: "center" },
  cancelShiftButtonText: { color: "#92400E", fontSize: 14, fontWeight: "700" },
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

  // Cancel / Release modals
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 4 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  modalSubtitle: { marginTop: 4, fontSize: 13, color: "#64748B", lineHeight: 18 },
  modalLabel: { marginTop: 16, fontSize: 13, fontWeight: "600", color: "#0F172A" },
  modalLabelOptional: { fontWeight: "400", color: "#94A3B8" },
  modalTextarea: {
    marginTop: 8,
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
    textAlignVertical: "top",
  },
  modalCharCount: { marginTop: 4, fontSize: 11, color: "#94A3B8", textAlign: "right" },
  noteBox: { marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 12, padding: 12 },
  noteBoxText: { flex: 1, fontSize: 12, lineHeight: 17 },
  modalActions: { marginTop: 16, flexDirection: "row", gap: 10 },
  modalKeepButton: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  modalKeepButtonText: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  modalConfirmButton: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalConfirmButtonText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
});

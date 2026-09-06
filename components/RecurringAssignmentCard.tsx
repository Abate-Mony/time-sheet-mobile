import { queryClient } from "@/lib/queryClient"
import customFetch from "@/utils/customFetch"
import { fmtDate, statusLabel, statusStyle } from "@/utils/recurring"
import type { WorkerRecurringGroup } from "@/utils/types"
import { isAxiosError } from "axios"
import { CheckCircle2, ChevronDown, ChevronRight, Clock, MapPin, MoreHorizontal, Repeat2 } from "lucide-react-native"
import { useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import Toast from "react-native-toast-message"
import { BulkAcceptDialog } from "./BulkAcceptDialog"

export function RecurringAssignmentCard({ group }: { group: WorkerRecurringGroup }) {
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showMoreActions, setShowMoreActions] = useState(false)
  const [confirmingDecline, setConfirmingDecline] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const allAccepted = group.pendingCount === 0 && group.acceptedCount > 0
  const isNew = group.pendingCount > 0 && group.acceptedCount > 0

  const handleDeclineAll = async () => {
    setDeclining(true)
    try {
      await customFetch.patch(`/workers/recurring-jobs/${group.recurringJobId}/decline-all`)
      queryClient.invalidateQueries({ queryKey: ["worker-recurring-groups"] })
      Toast.show({
        type: "success",
        text1: `Declined ${group.pendingCount} pending shift${group.pendingCount === 1 ? "" : "s"}.`,
      })
    } catch (err) {
      Toast.show({
        type: "error",
        text1: isAxiosError(err) ? err.response?.data?.msg ?? "Failed to decline these shifts." : "Failed to decline these shifts.",
      })
    } finally {
      setDeclining(false)
      setConfirmingDecline(false)
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.stripe}>
        <Repeat2 size={11} color="rgba(30,58,95,0.6)" />
        <Text style={styles.stripeText}>Recurring shifts</Text>
        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>New</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{group.title}</Text>
        <Text style={styles.recurrenceLine}>
          {group.recurrenceLabel} · {group.startTime}–{group.endTime}
        </Text>
        {!!group.location && (
          <View style={styles.locationRow}>
            <MapPin size={10} color="#94A3B8" />
            <Text style={styles.locationText}>{group.location}</Text>
          </View>
        )}

        {allAccepted ? (
          <View style={styles.allAcceptedRow}>
            <CheckCircle2 size={14} color="#10B981" />
            <Text style={styles.allAcceptedText}>
              All {group.acceptedCount} currently scheduled shifts accepted
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.pendingRow}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{group.pendingCount}</Text>
              </View>
              <Text style={styles.pendingText}>
                {group.pendingCount === 1 ? "1 shift" : `${group.pendingCount} shifts`} waiting for your response
              </Text>
            </View>

            {group.nextShift && (
              <View style={styles.nextShiftBox}>
                <Clock size={12} color="#94A3B8" />
                <View>
                  <Text style={styles.nextShiftLabel}>Next shift</Text>
                  <Text style={styles.nextShiftValue}>
                    {fmtDate(group.nextShift.date)} · {group.nextShift.startTime}–{group.nextShift.endTime}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        <View style={styles.actionsCol}>
          {group.pendingCount > 0 && (
            <Pressable style={styles.acceptAllButton} onPress={() => setShowAcceptDialog(true)}>
              <CheckCircle2 size={14} color="#FFFFFF" />
              <Text style={styles.acceptAllButtonText}>Accept all {group.pendingCount} pending</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.reviewButton, allAccepted && styles.reviewButtonFilled]}
            onPress={() => setExpanded(e => !e)}
          >
            <Text style={[styles.reviewButtonText, allAccepted && styles.reviewButtonTextFilled]}>
              {allAccepted ? "View shifts" : "Review shifts"}
            </Text>
            <ChevronRight
              size={13}
              color={allAccepted ? "#334155" : "#64748B"}
              style={expanded ? styles.chevronRotated : undefined}
            />
          </Pressable>

          {expanded && (
            <View style={styles.shiftList}>
              {group.shifts.map(s => {
                const style = statusStyle(s.status)
                return (
                  <View key={s.jobId} style={styles.shiftRow}>
                    <Text style={styles.shiftRowText}>
                      {fmtDate(s.date)} · {s.startTime}–{s.endTime}
                    </Text>
                    <View style={[styles.shiftStatusBadge, { backgroundColor: style.bg }]}>
                      <Text style={[styles.shiftStatusText, { color: style.text }]}>{statusLabel(s.status)}</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {!allAccepted && group.pendingCount > 0 && (
          <View style={styles.moreActionsWrap}>
            <Pressable style={styles.moreActionsButton} onPress={() => setShowMoreActions(o => !o)}>
              <MoreHorizontal size={12} color="#94A3B8" />
              <Text style={styles.moreActionsText}>More actions</Text>
              <ChevronDown size={11} color="#94A3B8" style={showMoreActions ? styles.chevronRotated : undefined} />
            </Pressable>

            {showMoreActions && (
              !confirmingDecline ? (
                <Pressable style={styles.declineAllButton} onPress={() => setConfirmingDecline(true)}>
                  <Text style={styles.declineAllButtonText}>
                    Decline all {group.pendingCount} pending shifts
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.confirmDeclineRow}>
                  <Text style={styles.confirmDeclineText}>Decline all {group.pendingCount}?</Text>
                  <Pressable
                    style={styles.declineCancelButton}
                    disabled={declining}
                    onPress={() => setConfirmingDecline(false)}
                  >
                    <Text style={styles.declineCancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.declineConfirmButton} disabled={declining} onPress={handleDeclineAll}>
                    {declining ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.declineConfirmButtonText}>Yes, decline</Text>
                    )}
                  </Pressable>
                </View>
              )
            )}
          </View>
        )}
      </View>

      {showAcceptDialog && (
        <BulkAcceptDialog
          group={group}
          onClose={() => setShowAcceptDialog(false)}
          onAccepted={() => setShowAcceptDialog(false)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(30,58,95,0.15)",
    overflow: "hidden",
  },

  stripe: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(30,58,95,0.04)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(30,58,95,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  stripeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(30,58,95,0.6)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  newBadge: {
    marginLeft: "auto",
    backgroundColor: "#FBBF24",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  newBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  body: {
    padding: 16,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },

  recurrenceLine: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 2,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },

  locationText: {
    fontSize: 12,
    color: "#94A3B8",
  },

  allAcceptedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  allAcceptedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#047857",
    flex: 1,
  },

  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  pendingBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },

  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B45309",
  },

  pendingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
  },

  nextShiftBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  nextShiftLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  nextShiftValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },

  actionsCol: {
    gap: 8,
  },

  acceptAllButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1E3A5F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  acceptAllButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  reviewButton: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  reviewButtonFilled: {
    borderWidth: 0,
    backgroundColor: "#F1F5F9",
  },

  reviewButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },

  reviewButtonTextFilled: {
    color: "#334155",
  },

  chevronRotated: {
    transform: [{ rotate: "90deg" }],
  },

  shiftList: {
    gap: 6,
    paddingTop: 2,
  },

  shiftRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  shiftRowText: {
    fontSize: 12,
    color: "#475569",
    flex: 1,
  },

  shiftStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },

  shiftStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  moreActionsWrap: {
    marginTop: 8,
    alignItems: "center",
  },

  moreActionsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  moreActionsText: {
    fontSize: 12,
    color: "#94A3B8",
  },

  declineAllButton: {
    width: "100%",
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  declineAllButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },

  confirmDeclineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    width: "100%",
  },

  confirmDeclineText: {
    fontSize: 12,
    color: "#475569",
    flex: 1,
  },

  declineCancelButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  declineCancelButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },

  declineConfirmButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },

  declineConfirmButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})

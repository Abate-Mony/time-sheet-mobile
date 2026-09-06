import { queryClient } from "@/lib/queryClient"
import customFetch from "@/utils/customFetch"
import { fmtDate } from "@/utils/recurring"
import type { DialogState, WorkerRecurringGroup } from "@/utils/types"
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react-native"
import { useState } from "react"
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native"

const MAX_SHOW = 5

export function BulkAcceptDialog({
  group,
  onClose,
  onAccepted,
}: {
  group: WorkerRecurringGroup
  onClose: () => void
  onAccepted: (count: number) => void
}) {
  const [state, setState] = useState<DialogState>("confirm")
  const [acceptedCount, setAcceptedCount] = useState(0)

  const pending = group.shifts.filter(s => s.status === "pending")
  const firstShift = pending[0]
  const lastShift = pending[pending.length - 1]
  const shown = pending.slice(0, MAX_SHOW)
  const rest = pending.length - shown.length

  const handleConfirm = async () => {
    setState("loading")
    try {
      // The backend re-checks what's actually still pending rather than
      // trusting group.pendingCount — the returned count can legitimately
      // differ (another device, a shift expiring, a manager cancelling one).
      const { data } = await customFetch.patch<{ accepted: number }>(
        `/workers/recurring-jobs/${group.recurringJobId}/accept-all`
      )
      const returned = data.accepted
      setAcceptedCount(returned)
      queryClient.invalidateQueries({ queryKey: ["worker-recurring-groups"] })
      if (returned === 0) setState("empty")
      else if (returned < group.pendingCount) setState("partial")
      else setState("success")
      onAccepted(returned)
    } catch {
      setState("error")
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => state !== "loading" && onClose()}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => state !== "loading" && onClose()} />

        <View style={styles.sheet}>
          {state === "confirm" && (
            <View style={styles.padded}>
              <View style={styles.headerRow}>
                <View style={styles.flex1}>
                  <Text style={styles.eyebrow}>Accept upcoming shifts</Text>
                  <Text style={styles.heading}>Accept all {group.pendingCount} pending shifts?</Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
                  <X size={15} color="#94A3B8" />
                </Pressable>
              </View>

              <Text style={styles.bodyText}>
                You&apos;re accepting <Text style={styles.bold}>{group.pendingCount} currently scheduled shifts</Text> for:
              </Text>

              <View style={styles.jobBox}>
                <Text style={styles.jobBoxTitle}>{group.title}</Text>
                <Text style={styles.jobBoxSub}>
                  {group.recurrenceLabel} · {group.startTime}–{group.endTime}
                </Text>
              </View>

              {firstShift && lastShift && (
                <View style={styles.rangeRow}>
                  <View style={styles.rangeBox}>
                    <Text style={styles.rangeLabel}>First shift</Text>
                    <Text style={styles.rangeValue}>{fmtDate(firstShift.date)}</Text>
                  </View>
                  <View style={styles.rangeBox}>
                    <Text style={styles.rangeLabel}>Last current shift</Text>
                    <Text style={styles.rangeValue}>{fmtDate(lastShift.date)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.confirmRow}>
                <CheckCircle2 size={14} color="#10B981" />
                <Text style={styles.confirmText}>{group.pendingCount} shifts will be accepted</Text>
              </View>

              <View style={styles.previewCard}>
                <Text style={styles.previewHeading}>Affected shifts</Text>
                {shown.map(s => (
                  <View key={s.jobId} style={styles.previewRow}>
                    <View style={styles.previewDot} />
                    <Text style={styles.previewText}>
                      {fmtDate(s.date)} · {s.startTime}–{s.endTime}
                    </Text>
                  </View>
                ))}
                {rest > 0 && <Text style={styles.previewMore}>+ {rest} more</Text>}
              </View>

              <View style={styles.noticeBox}>
                <Info size={13} color="#60A5FA" />
                <Text style={styles.noticeText}>
                  <Text style={styles.bold}>Future shifts created later are not included.</Text> You will need to
                  respond to any new shifts separately.
                </Text>
              </View>

              <View style={styles.actionRow}>
                <Pressable style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={handleConfirm}>
                  <Text style={styles.confirmButtonText}>Accept all {group.pendingCount}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {state === "loading" && (
            <View style={styles.centeredPad}>
              <View style={styles.loadingIcon}>
                <ActivityIndicator size="small" color="#1E3A5F" />
              </View>
              <Text style={[styles.heading, styles.headingCentered]}>Accepting {group.pendingCount} shifts…</Text>
              <Text style={styles.mutedText}>Please wait</Text>
            </View>
          )}

          {state === "success" && (
            <View style={styles.centeredPad}>
              <View style={styles.successIcon}>
                <CheckCircle2 size={32} color="#10B981" />
              </View>
              <Text style={[styles.heading, styles.headingCentered]}>{acceptedCount} shifts accepted!</Text>
              <Text style={styles.mutedText}>You&apos;re confirmed for all currently scheduled shifts.</Text>
              <View style={styles.successNotice}>
                <Text style={styles.successNoticeText}>
                  Remember: future shifts created later will need a separate response.
                </Text>
              </View>
              <Pressable style={[styles.confirmButton, styles.fullWidth]} onPress={onClose}>
                <Text style={styles.confirmButtonText}>Done</Text>
              </Pressable>
            </View>
          )}

          {state === "partial" && (
            <View style={styles.padded}>
              <View style={styles.warningIcon}>
                <AlertTriangle size={18} color="#F59E0B" />
              </View>
              <Text style={styles.heading}>Some shifts changed</Text>
              <Text style={styles.bodyText}>
                <Text style={styles.bold}>{acceptedCount} shifts were accepted.</Text>{" "}
                {group.pendingCount - acceptedCount} were no longer available. Your job list has been refreshed.
              </Text>
              <Pressable style={[styles.confirmButton, styles.fullWidth]} onPress={onClose}>
                <Text style={styles.confirmButtonText}>Done</Text>
              </Pressable>
            </View>
          )}

          {state === "empty" && (
            <View style={styles.centeredPad}>
              <View style={styles.emptyIcon}>
                <CheckCircle2 size={18} color="#94A3B8" />
              </View>
              <Text style={[styles.heading, styles.headingCentered]}>No shifts need a response</Text>
              <Text style={styles.mutedText}>These shifts have already been updated.</Text>
              <Pressable style={[styles.cancelButton, styles.fullWidth]} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </Pressable>
            </View>
          )}

          {state === "error" && (
            <View style={styles.padded}>
              <View style={styles.warningIconRed}>
                <AlertTriangle size={18} color="#EF4444" />
              </View>
              <Text style={styles.heading}>Couldn&apos;t accept these shifts</Text>
              <Text style={styles.bodyText}>Your shifts have not been changed. Please try again.</Text>
              <View style={styles.actionRow}>
                <Pressable style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={() => setState("confirm")}>
                  <Text style={styles.confirmButtonText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
  },

  padded: {
    padding: 20,
  },

  centeredPad: {
    padding: 28,
    alignItems: "center",
    gap: 6,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  flex1: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },

  heading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  headingCentered: {
    textAlign: "center",
  },

  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  bodyText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 12,
    textAlign: "left",
  },

  bold: {
    fontWeight: "700",
    color: "#1E293B",
  },

  jobBox: {
    backgroundColor: "rgba(30,58,95,0.05)",
    borderWidth: 1,
    borderColor: "rgba(30,58,95,0.12)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },

  jobBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  jobBoxSub: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },

  rangeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  rangeBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
  },

  rangeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  rangeValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },

  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },

  confirmText: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
  },

  previewCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },

  previewHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FBBF24",
  },

  previewText: {
    fontSize: 13,
    color: "#334155",
  },

  previewMore: {
    fontSize: 12,
    color: "#94A3B8",
    marginLeft: 14,
  },

  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 14,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 12,
  },

  noticeText: {
    flex: 1,
    fontSize: 12,
    color: "#1D4ED8",
    lineHeight: 17,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },

  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },

  confirmButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  fullWidth: {
    width: "100%",
    marginTop: 18,
  },

  loadingIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(30,58,95,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  warningIconRed: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  mutedText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },

  successNotice: {
    width: "100%",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },

  successNoticeText: {
    fontSize: 12,
    color: "#047857",
    textAlign: "center",
  },
})

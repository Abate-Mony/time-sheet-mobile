import { useShiftStartGate } from '@/hooks/shiftgate'
import { changeWorkerJobStaus } from '@/utils/api-request-functions'
import { formatDate, formatDuration, formatTimeUntil } from '@/utils/date'
import { WorkerJob } from '@/utils/types'
import { useRouter } from "expo-router"
import { AlertCircle, Briefcase, Calendar, ChevronRight, Clock as ClockIcon, MapPin, Timer, X } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

// Matches JobCard.tsx's statusColor map on web — the accent stripe should
// reflect the job's real status, not be hardcoded to one colour for every
// status.
const STATUS_ACCENT: Record<string, string> = {
    "in-progress": "#3B82F6",
    completed: "#10B981",
    pending: "#F59E0B",
    declined: "#F43F5E",
    accepted: "#22C55E",
    cancelled: "#F43F5E",
}

const STATUS_STYLES = {
    pending: { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
    accepted: { bg: "#DBEAFE", text: "#1D4ED8", label: "Accepted" },
    "in-progress": { bg: "#DCFCE7", text: "#166534", label: "In Progress" },
    completed: { bg: "#D1FAE5", text: "#047857", label: "Completed" },
    declined: { bg: "#E2E8F0", text: "#475569", label: "Declined" },
    cancelled: { bg: "#FEE2E2", text: "#B91C1C", label: "Cancelled" },
} as const

// Decline confirmation — matches JobCard.tsx's modal on web (job recap +
// optional reason). React Native has no <dialog>; a full-screen Modal
// presented from the bottom is the native equivalent of web's bottom
// sheet-on-mobile / centered-dialog-on-desktop pattern.
function DeclineModal({
    job,
    visible,
    loading,
    onCancel,
    onConfirm,
}: {
    job: WorkerJob
    visible: boolean
    loading: boolean
    onCancel: () => void
    onConfirm: (reason: string) => void
}) {
    const [reason, setReason] = useState("")

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalSheet}>
                    <View style={styles.modalHeaderRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle}>Decline this shift?</Text>
                            <Text style={styles.modalSubtitle}>
                                Your manager will see that you are not available for this assignment.
                            </Text>
                        </View>
                        <Pressable onPress={onCancel} disabled={loading} hitSlop={8} style={styles.modalCloseButton}>
                            <X size={16} color="#64748B" />
                        </Pressable>
                    </View>

                    <View style={styles.modalJobRecap}>
                        <Text style={styles.modalJobTitle} numberOfLines={1}>{job.title}</Text>
                        <Text style={styles.modalJobMeta}>
                            {formatDate(job.date, "ddd, D MMM")} · {job.startTime} – {job.endTime}
                        </Text>
                        {!!job.location && (
                            <View style={styles.modalJobLocationRow}>
                                <MapPin size={12} color="#94A3B8" />
                                <Text style={styles.modalJobLocationText} numberOfLines={1}>{job.location}</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.modalLabel}>Reason <Text style={styles.modalLabelOptional}>(optional)</Text></Text>
                    <TextInput
                        value={reason}
                        onChangeText={t => setReason(t.slice(0, 300))}
                        placeholder="Tell your manager why you can't attend this shift…"
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={4}
                        style={styles.modalTextarea}
                        editable={!loading}
                    />
                    <Text style={styles.modalCharCount}>{reason.length}/300</Text>

                    <View style={styles.modalActions}>
                        <Pressable
                            style={[styles.modalKeepButton, loading && styles.disabled]}
                            disabled={loading}
                            onPress={onCancel}
                        >
                            <Text style={styles.modalKeepButtonText}>Keep shift</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.modalDeclineButton, loading && styles.disabled]}
                            disabled={loading}
                            onPress={() => onConfirm(reason)}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.modalDeclineButtonText}>Decline shift</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

export default function JobCard(job: WorkerJob) {
    const [actingOn, setActingOn] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showDeclineModal, setShowDeclineModal] = useState(false)
    const router = useRouter()
    const { canStart, minutesUntilStart, hasExpired } = useShiftStartGate(job.date, job.startTime, job.endTime)

    useEffect(() => {
        if (!error) return
        const id = setTimeout(() => setError(null), 5000)
        return () => clearTimeout(id)
    }, [error])

    const act = async (status: "accepted" | "declined" | "in-progress") => {
        setActingOn(job._id)
        const result = await changeWorkerJobStaus(job._id, status)
        setActingOn(null)

        if (!result.success) {
            setError(result.message || "An error occurred. Please try again.")
            return
        }

        if (status === "in-progress") {
            router.push("/(tabs)/clock")
        }
    }

    const confirmDecline = async (_reason: string) => {
        // Backend doesn't accept a decline reason yet — matches web's
        // JobCard, which captures it but doesn't send it either (see the
        // comment there on changeWorkerJobStaus's current signature).
        await act("declined")
        setShowDeclineModal(false)
    }

    const isActing = actingOn === job._id
    const statusStyle = STATUS_STYLES[job.status] ?? STATUS_STYLES.pending
    const accent = STATUS_ACCENT[job.status] ?? "#94A3B8"

    return (
        <>
            <Pressable
                style={styles.card}
                onPress={() => router.push({ pathname: "/jobs/[id]", params: { id: job._id } })}
            >
                <View style={[styles.statusbar, { backgroundColor: accent }]} />

                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.jobTitle} numberOfLines={1}>
                            {job.title}
                        </Text>
                        {!!job.client?.name && (
                            <Text style={styles.clientName} numberOfLines={1}>{job.client.name}</Text>
                        )}
                    </View>

                    <View style={styles.headerRight}>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                                {statusStyle.label}
                            </Text>
                        </View>
                        <ChevronRight size={16} color="#CBD5E1" />
                    </View>
                </View>

                <View style={styles.metaList}>
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
                        <Briefcase size={13} color="#64748B" />
                        <Text style={styles.metaText}>{formatDuration(job.minutes)} shift</Text>
                    </View>
                    <View style={styles.metaRow}>
                        <MapPin size={13} color="#64748B" />
                        <Text style={styles.metaText} numberOfLines={1}>
                            {job.location}
                        </Text>
                    </View>
                </View>

                {!!job.description && (
                    <View style={styles.descriptionBanner}>
                        <AlertCircle size={12} color="#D97706" style={{ marginTop: 1 }} />
                        <Text style={styles.descriptionText}>{job.description}</Text>
                    </View>
                )}

                {error && (
                    <View style={styles.errorBanner}>
                        <AlertCircle size={13} color="#DC2626" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {(job.status === "pending" || job.status === "accepted" || job.status === "in-progress") && (
                    <View style={styles.divider} />
                )}

                {job.status === "pending" && (
                    <View style={styles.actionRow}>
                        <Pressable
                            style={[styles.declineButton, isActing && styles.disabled]}
                            disabled={isActing}
                            onPress={(e) => {
                                e.stopPropagation()
                                setShowDeclineModal(true)
                            }}
                        >
                            <Text style={styles.declineButtonText}><X size={12} color={"#727573"} /> Decline</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.acceptButton, isActing && styles.disabled]}
                            disabled={isActing}
                            onPress={(e) => {
                                e.stopPropagation()
                                act("accepted")
                            }}
                        >
                            {isActing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.acceptButtonText}>Accept</Text>
                            )}
                        </Pressable>
                    </View>
                )}

                {job.status === "accepted" && (
                    canStart ? (
                        <Pressable
                            style={[styles.startButton, isActing && styles.disabled]}
                            disabled={isActing}
                            onPress={(e) => {
                                e.stopPropagation()
                                act("in-progress")
                            }}
                        >
                            {isActing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.startButtonText}>Start Job</Text>
                            )}
                        </Pressable>
                    ) : (
                        <View style={[styles.waitRow, hasExpired && styles.waitRowExpired]}>
                            <Timer size={14} color={hasExpired ? "#B91C1C" : "#94A3B8"} />
                            <Text style={[styles.waitText, hasExpired && styles.waitTextExpired]}>
                                {hasExpired ? "Shift window missed" : `Starts in ${formatTimeUntil(minutesUntilStart ?? 0)}`}
                            </Text>
                        </View>
                    )
                )}

                {job.status === "in-progress" && (
                    <Pressable
                        style={styles.continueButton}
                        onPress={(e) => {
                            e.stopPropagation()
                            router.push("/(tabs)/clock")
                        }}
                    >
                        <View style={styles.liveDot} />
                        <Text style={styles.continueButtonText}>Continue</Text>
                    </Pressable>
                )}
            </Pressable>

            <DeclineModal
                job={job}
                visible={showDeclineModal}
                loading={isActing}
                onCancel={() => setShowDeclineModal(false)}
                onConfirm={confirmDecline}
            />
        </>
    )
}

const styles = StyleSheet.create({
    statusbar: {
        height: 4,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
    },
    card: {
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        borderRadius: 15,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        padding: 16,
        gap: 10,

        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
        position: "relative"
    },

    cardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
    },

    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    jobTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0F172A",
    },

    clientName: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: "500",
        color: "#94A3B8",
    },

    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },

    statusBadgeText: {
        fontSize: 10,
        fontWeight: "800",
    },

    metaList: {
        gap: 6,
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

    descriptionBanner: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: "#FFFBEB",
        borderWidth: 1,
        borderColor: "#FDE68A",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },

    descriptionText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 17,
        color: "#B45309",
    },

    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },

    errorText: {
        flex: 1,
        color: "#B91C1C",
        fontSize: 12,
        fontWeight: "500",
    },

    divider: {
        height: 1,
        backgroundColor: "#F1F5F9",
    },

    actionRow: {
        flexDirection: "row",
        gap: 10,
    },

    declineButton: {
        flex: 0,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: 10,
        paddingRight: 10,
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
    },

    startButtonText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
    },

    waitRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
    },

    waitRowExpired: {
        backgroundColor: "#FEF2F2",
    },

    waitText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748B",
    },

    waitTextExpired: {
        color: "#B91C1C",
    },

    continueButton: {
        height: 40,
        borderRadius: 10,
        backgroundColor: "#2563EB",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },

    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#34D399",
    },

    continueButtonText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
    },

    disabled: {
        opacity: 0.6,
    },

    // Decline modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.4)",
        justifyContent: "flex-end",
    },

    modalSheet: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        gap: 4,
    },

    modalHeaderRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },

    modalTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
    },

    modalSubtitle: {
        marginTop: 4,
        fontSize: 13,
        color: "#64748B",
        lineHeight: 18,
    },

    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F1F5F9",
    },

    modalJobRecap: {
        marginTop: 14,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 12,
        gap: 6,
    },

    modalJobTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#0F172A",
    },

    modalJobMeta: {
        fontSize: 12,
        color: "#64748B",
    },

    modalJobLocationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    modalJobLocationText: {
        fontSize: 12,
        color: "#94A3B8",
        flexShrink: 1,
    },

    modalLabel: {
        marginTop: 16,
        fontSize: 13,
        fontWeight: "600",
        color: "#0F172A",
    },

    modalLabelOptional: {
        fontWeight: "400",
        color: "#94A3B8",
    },

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

    modalCharCount: {
        marginTop: 4,
        fontSize: 11,
        color: "#94A3B8",
        textAlign: "right",
    },

    modalActions: {
        marginTop: 16,
        flexDirection: "row",
        gap: 10,
    },

    modalKeepButton: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        alignItems: "center",
        justifyContent: "center",
    },

    modalKeepButtonText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#0F172A",
    },

    modalDeclineButton: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: "#E11D48",
        alignItems: "center",
        justifyContent: "center",
    },

    modalDeclineButtonText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
    },
})

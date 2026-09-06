import { useShiftStartGate } from '@/hooks/shiftgate'
import { changeWorkerJobStaus } from '@/utils/api-request-functions'
import { formatDate, formatTimeUntil } from '@/utils/date'
import { WorkerJob } from '@/utils/types'
import { useRouter } from "expo-router"
import { AlertCircle, Calendar, ChevronRight, Clock as ClockIcon, MapPin, Timer } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

const STATUS_STYLES = {
    pending: { bg: "#FEF3C7", text: "#92400E", label: "New" },
    accepted: { bg: "#DBEAFE", text: "#1D4ED8", label: "Upcoming" },
    "in-progress": { bg: "#DCFCE7", text: "#166534", label: "Active" },
    completed: { bg: "#D1FAE5", text: "#047857", label: "Completed" },
    declined: { bg: "#E2E8F0", text: "#475569", label: "Declined" },
    cancelled: { bg: "#FEE2E2", text: "#B91C1C", label: "Cancelled" },
} as const

export default function JobCard(job: WorkerJob) {
    const [actingOn, setActingOn] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
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

    const isActing = actingOn === job._id
    const statusStyle = STATUS_STYLES[job.status] ?? STATUS_STYLES.pending

    return (
        <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: "/jobs/[id]", params: { id: job._id } })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.jobTitle} numberOfLines={1}>
                    {job.title}  
                </Text>

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
                    <MapPin size={13} color="#64748B" />
                    <Text style={styles.metaText} numberOfLines={1}>
                        {job.location}
                    </Text>
                </View>
            </View>

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
                        onPress={() => act("declined")}
                    >
                        <Text style={styles.declineButtonText}>Decline</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.acceptButton, isActing && styles.disabled]}
                        disabled={isActing}
                        onPress={() => act("accepted")}
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
                        onPress={() => act("in-progress")}
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
                <Pressable style={styles.continueButton} onPress={() => router.push("/(tabs)/clock")}>
                    <View style={styles.liveDot} />
                    <Text style={styles.continueButtonText}>Continue</Text>
                </Pressable>
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        padding: 16,
        gap: 10,

        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
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
        flex: 1,
        fontSize: 15,
        fontWeight: "700",
        color: "#0F172A",
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
})

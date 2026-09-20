import { formatDate, formatDuration } from '@/utils/date'
import { WorkerJob } from '@/utils/types'
import { useRouter } from "expo-router"
import { Calendar as CalendarIcon, CheckCircle2, Clock as ClockIcon, MapPin } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

// Mirrors web's CompletedJobCard.tsx — a completed shift's headline stat
// is hours worked, not a status badge, with a green accent instead of the
// generic JobCard's per-status one.
export default function CompletedJobCard(job: WorkerJob) {
    const router = useRouter()

    return (
        <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: "/jobs/[id]", params: { id: job._id } })}
        >
            <View style={styles.accentBar} />
            <View style={styles.body}>
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <View style={styles.iconCircle}>
                            <CheckCircle2 size={14} color="#059669" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                            {!!job.client?.name && (
                                <Text style={styles.clientName} numberOfLines={1}>{job.client.name}</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.workedBlock}>
                        <Text style={styles.workedValue}>{formatDuration(job.minutes)}</Text>
                        <Text style={styles.workedLabel}>WORKED</Text>
                    </View>
                </View>

                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <CalendarIcon size={12} color="#94A3B8" />
                        <Text style={styles.metaText}>{formatDate(job.date, "ddd, D MMM")}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <ClockIcon size={12} color="#94A3B8" />
                        <Text style={styles.metaText}>{job.startTime} – {job.endTime}</Text>
                    </View>
                    {!!job.location && (
                        <View style={[styles.metaItem, { flexShrink: 1 }]}>
                            <MapPin size={12} color="#94A3B8" />
                            <Text style={styles.metaText} numberOfLines={1}>{job.location}</Text>
                        </View>
                    )}
                </View>
            </View>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    card: {
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        borderRadius: 15,
        borderWidth: 1,
        borderColor: "#E2E8F0",

        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },

    accentBar: {
        height: 4,
        backgroundColor: "#10B981",
    },

    body: {
        padding: 16,
        gap: 12,
    },

    headerRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
    },

    headerLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },

    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#ECFDF5",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },

    jobTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0F172A",
    },

    clientName: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: "500",
        color: "#94A3B8",
    },

    workedBlock: {
        alignItems: "flex-end",
    },

    workedValue: {
        fontSize: 17,
        fontWeight: "800",
        color: "#059669",
        lineHeight: 20,
    },

    workedLabel: {
        marginTop: 3,
        fontSize: 9,
        fontWeight: "700",
        color: "#94A3B8",
        letterSpacing: 0.5,
    },

    metaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },

    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    metaText: {
        fontSize: 12,
        color: "#64748B",
    },
})

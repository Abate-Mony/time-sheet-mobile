import { formatDate } from "@/utils/date"
import { useRouter } from "expo-router"
import { ArrowRight, Briefcase, Calendar, Clock } from "lucide-react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { Pressable, StyleSheet, Text, View } from "react-native"

type NextShift = {
  _id: string
  title: string
  date: string
  startTime: string
  location: string
} | null

export function NoActiveShift({ nextShift }: { nextShift?: NextShift }) {
  const router = useRouter()

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
      {/* Idle clock card — same shape as the running timer so the swap feels continuous */}
      <View style={styles.idleCard}>
        <View style={styles.idleIcon}>
          <Clock size={26} color="rgba(255,255,255,0.4)" />
        </View>

        <Text style={styles.idleLabel}>Not clocked in</Text>
        <Text style={styles.idleClock}>00:00:00</Text>
        <Text style={styles.idleCaption}>Your timer starts when you begin a shift</Text>
      </View>

      {/* Next shift, if there is one */}
      {nextShift ? (
        <Pressable
          style={styles.nextShiftCard}
          onPress={() => router.push({ pathname: "/jobs/[id]", params: { id: nextShift._id } })}
        >
          <View style={styles.nextShiftHeader}>
            <Calendar size={13} color="#1E3A5F" />
            <Text style={styles.nextShiftLabel}>Up next</Text>
          </View>

          <Text style={styles.nextShiftTitle}>{nextShift.title}</Text>
          <Text style={styles.nextShiftMeta}>
            {formatDate(nextShift.date)} · {nextShift.startTime} · {nextShift.location}
          </Text>

          <View style={styles.viewShiftRow}>
            <Text style={styles.viewShiftText}>View shift</Text>
            <ArrowRight size={13} color="#2563EB" />
          </View>
        </Pressable>
      ) : (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Briefcase size={18} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyTitle}>No upcoming shifts</Text>
          <Text style={styles.emptyCaption}>
            When your manager assigns you a job, it&apos;ll appear here ready to start.
          </Text>
        </View>
      )}

      <Pressable style={styles.browseButton} onPress={() => router.push("/(tabs)/jobs")}>
        <Briefcase size={15} color="#94A3B8" />
        <Text style={styles.browseButtonText}>Browse my jobs</Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 16,
  },

  idleCard: {
    borderRadius: 24,
    backgroundColor: "#0F172A",
    padding: 32,
    alignItems: "center",
  },

  idleIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  idleLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  idleClock: {
    fontSize: 44,
    fontWeight: "800",
    color: "rgba(255,255,255,0.15)",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
    marginBottom: 4,
  },

  idleCaption: {
    fontSize: 12,
    color: "rgba(255,255,255,0.2)",
    fontWeight: "500",
  },

  nextShiftCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },

  nextShiftHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  nextShiftLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  nextShiftTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },

  nextShiftMeta: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },

  viewShiftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  viewShiftText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 24,
    alignItems: "center",
  },

  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },

  emptyCaption: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
    maxWidth: 220,
  },

  browseButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  browseButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
})

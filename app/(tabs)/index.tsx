import { useAuth } from "@/context/AuthContext"
import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"
import { useRouter } from "expo-router"
import { AlertCircle, Bell, Briefcase, ChevronRight, Clock, Timer, TrendingUp } from "lucide-react-native"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import customFetch from "../../utils/customFetch"
import type { MyJobsResponse, WorkerJob } from "../../utils/types"

dayjs.extend(isoWeek)

const WEEKLY_TARGET_HOURS = 40
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"]

export default function DashboardScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [jobs, setJobs] = useState<WorkerJob[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const { data } = await customFetch.get<MyJobsResponse>("/workers", { params: { limit: 100 } })
      setError("")
      setJobs(data.jobs)
    } catch {
      setError("Couldn't load your dashboard. Pull down to try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Fetch the initial dashboard data when this screen mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const activeJob = jobs.find(j => j.status === "in-progress")
  const jobsCompleted = jobs.filter(j => j.status === "completed").length

  const weekDays = useMemo(() => {
    const weekStart = dayjs().startOf("isoWeek")
    const today = dayjs()
    return Array.from({ length: 7 }, (_, i) => {
      const date = weekStart.add(i, "day")
      const dayJobs = jobs.filter(j => dayjs(j.date).isSame(date, "day"))
      const hours = dayJobs.reduce((sum, j) => sum + (j.hours ?? 0), 0)
      return {
        day: DAY_LETTERS[i],
        date: date.date(),
        isToday: date.isSame(today, "day"),
        hasShift: dayJobs.length > 0,
        hours,
      }
    })
  }, [jobs])

  const hoursThisWeek = useMemo(() => weekDays.reduce((sum, d) => sum + d.hours, 0), [weekDays])

  const hoursThisMonth = useMemo(() => {
    const monthStart = dayjs().startOf("month")
    const monthEnd = dayjs().endOf("month")
    return jobs
      .filter(j => {
        const d = dayjs(j.date)
        return d.isAfter(monthStart) && d.isBefore(monthEnd)
      })
      .reduce((sum, j) => sum + (j.hours ?? 0), 0)
  }, [jobs])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const firstName = user?.fullname?.split(" ")[0] ?? ""
  const initials = user?.fullname?.slice(0, 2)?.toUpperCase() ?? ""

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="small" color="#1E3A5F" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1E3A5F" />}
      >
        {error ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
              backgroundColor: "#FEF2F2",
              borderWidth: 1,
              borderColor: "#FECACA",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <AlertCircle size={15} color="#EF4444" style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 14, color: "#B91C1C" }}>{error}</Text>
          </View>
        ) : null}

        {/* Header */}
        <View style={{ backgroundColor: "#1E3A5F", borderRadius: 24, padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>{initials}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: "500" }}>{greeting}</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>{firstName}</Text>
              </View>
            </View>
            <Pressable
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
              hitSlop={8}
            >
              <Bell size={16} color="#FFFFFF" />
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#60A5FA",
                  borderWidth: 2,
                  borderColor: "#1E3A5F",
                }}
              />
            </Pressable>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[
              { label: "This Week", value: `${hoursThisWeek}h`, icon: Clock },
              { label: "This Month", value: `${hoursThisMonth}h`, icon: TrendingUp },
              { label: "Jobs Done", value: `${jobsCompleted}`, icon: Briefcase },
            ].map(s => (
              <View
                key={s.label}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>{s.value}</Text>
                <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2, fontWeight: "500" }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Active job banner */}
        {activeJob ? (
          <Pressable
            onPress={() => router.push("/(tabs)/jobs")}
            style={({ pressed }) => ({
              backgroundColor: "#2563EB",
              borderRadius: 16,
              padding: 16,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Timer size={18} color="#FFFFFF" />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#34D399" }} />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      You&apos;re on the clock
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }} numberOfLines={1}>
                    {activeJob.title}
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.6)" />
            </View>
          </Pressable>
        ) : null}

        {/* This week */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 12 }}>This Week</Text>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {weekDays.map((d, i) => (
                <View key={i} style={{ alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: "600", color: "#94A3B8" }}>{d.day}</Text>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: d.isToday ? "#1E3A5F" : d.hasShift ? "#EFF6FF" : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: d.isToday ? "#FFFFFF" : d.hasShift ? "#1D4ED8" : "#94A3B8",
                      }}
                    >
                      {d.date}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 9, color: "#94A3B8", fontWeight: "500" }}>
                    {d.hasShift ? `${d.hours}h` : "—"}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: "#F1F5F9",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text style={{ fontSize: 12, color: "#64748B" }}>Total this week</Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A", marginTop: 2 }}>
                  {hoursThisWeek}h <Text style={{ fontSize: 14, fontWeight: "400", color: "#94A3B8" }}>/ {WEEKLY_TARGET_HOURS}h target</Text>
                </Text>
              </View>
              <View style={{ flex: 1, maxWidth: 120, marginLeft: 16 }}>
                <View style={{ height: 8, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                  <View
                    style={{
                      height: "100%",
                      backgroundColor: "#1E3A5F",
                      borderRadius: 4,
                      width: `${Math.min(100, (hoursThisWeek / WEEKLY_TARGET_HOURS) * 100)}%`,
                    }}
                  />
                </View>
                <Text style={{ fontSize: 10, color: "#94A3B8", marginTop: 4, textAlign: "right" }}>
                  {Math.round((hoursThisWeek / WEEKLY_TARGET_HOURS) * 100)}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

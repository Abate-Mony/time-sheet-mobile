import { workerDashboardstats } from "@/app/(tabs)/profile"
import { useAuth } from "@/context/AuthContext"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"
import { useRouter } from "expo-router"
import { AlertCircle, Calendar, ChevronRight, Clock, MapPin, Timer, Zap } from "lucide-react-native"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import customFetch from "../../utils/customFetch"
import { formatDate } from "../../utils/date"
import type { MyJobsResponse, WorkerJob } from "../../utils/types"

const UPCOMING_SHIFTS_LIMIT = 5

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

  const { data: stats } = useQuery(workerDashboardstats())
  const monthly = stats?.monthly

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

  const upcomingShifts = useMemo(() => {
    const today = dayjs().startOf("day")
    return jobs
      .filter(j => !["completed", "declined", "cancelled"].includes(j.status) && !dayjs(j.date).isBefore(today, "day"))
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .slice(0, UPCOMING_SHIFTS_LIMIT)
  }, [jobs])

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
        {/* <View style={{ backgroundColor: "#1E3A5F", borderRadius: 24, padding: 20 }}>
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

     
        </View> */}

        {/* Earnings */}
        {monthly ? (
          <View style={{ backgroundColor: "#1E3A5F", borderRadius: 18, padding: 20, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.55)", letterSpacing: 0.7 }}>
                  EARNINGS THIS MONTH
                </Text>
                <Text style={{ marginTop: 4, fontSize: 30, fontWeight: "800", color: "#FFFFFF" }}>
                  £{monthly.earnings}
                </Text>
              </View>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={19} color="#93C5FD" />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                { label: "Hours", value: `${monthly.hoursWorked?.toFixed(1)}h` },
                { label: "Jobs", value: `${stats?.jobStats.completed ?? 0}` },
                { label: "£/hr avg", value: `${monthly.averagePayRate || 0}` },
              ].map(s => (
                <View
                  key={s.label}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255,255,255,0.10)",
                    borderRadius: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#FFFFFF" }}>{s.value}</Text>
                  <Text style={{ marginTop: 3, fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

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

        {/* Upcoming shifts */}
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B" }}>Upcoming Shifts</Text>
            <Pressable onPress={() => router.push("/(tabs)/jobs")} hitSlop={8}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#1E3A5F" }}>View all</Text>
            </Pressable>
          </View>

          {upcomingShifts.length === 0 ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                padding: 20,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 13, color: "#94A3B8" }}>No upcoming shifts scheduled</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {upcomingShifts.map(job => (
                <Pressable
                  key={job._id}
                  onPress={() => router.push({ pathname: "/jobs/[id]", params: { id: job._id } })}
                  style={({ pressed }) => ({
                    backgroundColor: "#FFFFFF",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    padding: 14,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: "#0F172A" }} numberOfLines={1}>
                      {job.title}
                    </Text>
                    <ChevronRight size={16} color="#CBD5E1" />
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Calendar size={12} color="#64748B" />
                      <Text style={{ fontSize: 12, color: "#64748B" }}>{formatDate(job.date)}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Clock size={12} color="#64748B" />
                      <Text style={{ fontSize: 12, color: "#64748B" }}>{job.startTime}</Text>
                    </View>
                  </View>

                  {!!job.location && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
                      <MapPin size={12} color="#94A3B8" />
                      <Text style={{ fontSize: 12, color: "#94A3B8" }} numberOfLines={1}>
                        {job.location}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

import { useRouter } from "expo-router"
import { Bell, ChevronLeft, RefreshCw, ShieldCheck } from "lucide-react-native"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { queryClient } from "@/lib/queryClient"
import { disableAppLock, enableAppLock, isAppLockEnabled, type AppLockAvailability } from "@/services/appLock"
import {
  isShiftEndAlertEnabled,
  reconcileShiftEndAlert,
  setShiftEndAlertEnabled,
} from "@/services/shiftEndAlert"
import { getLastSyncedAt, getQueuedActions } from "@/utils/offlineClockQueue"
import { syncOfflineClockQueue } from "@/utils/offlineClockSync"

const AVAILABILITY_MESSAGE: Record<AppLockAvailability, string> = {
  available: "",
  no_hardware: "Your device doesn't support biometric authentication.",
  not_enrolled: "Set up a passcode, fingerprint, or face unlock in your device settings first, then try again.",
}

function timeAgo(iso: string): string {
  const seconds = Math.max(Math.floor((Date.now() - new Date(iso).getTime()) / 1000), 0)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function SettingsScreen() {
  const router = useRouter()

  const [shiftEndAlert, setShiftEndAlert] = useState<boolean | null>(null)
  const [appLock, setAppLock] = useState<boolean | null>(null)
  const [appLockBusy, setAppLockBusy] = useState(false)

  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const loadQueueInfo = useCallback(async () => {
    const [actions, synced] = await Promise.all([getQueuedActions(), getLastSyncedAt()])
    setPendingCount(actions.length)
    setLastSyncedAt(synced)
  }, [])

  useEffect(() => {
    isShiftEndAlertEnabled().then(setShiftEndAlert)
    isAppLockEnabled().then(setAppLock)
    loadQueueInfo()
  }, [loadQueueInfo])

  const toggleShiftEndAlert = async (value: boolean) => {
    setShiftEndAlert(value)
    await setShiftEndAlertEnabled(value)

    // Apply immediately rather than waiting for the next ["active-job"]
    // query change — turning it off should cancel a pending alert right
    // away, and turning it on mid-shift should schedule one if there's
    // still time left, same rules reconcileShiftEndAlert already applies
    // on clock-in/out.
    const cached = queryClient.getQueryData(["active-job"]) as { job?: unknown } | undefined
    reconcileShiftEndAlert((cached?.job ?? null) as Parameters<typeof reconcileShiftEndAlert>[0])
  }

  const toggleAppLock = async (value: boolean) => {
    if (!value) {
      setAppLock(false)
      await disableAppLock()
      return
    }

    setAppLockBusy(true)
    const result = await enableAppLock()
    setAppLockBusy(false)

    if (result.success) {
      setAppLock(true)
      return
    }

    setAppLock(false)
    if (result.reason === "no_hardware" || result.reason === "not_enrolled") {
      Alert.alert("Can't turn on App Lock", AVAILABILITY_MESSAGE[result.reason])
    }
    // auth_failed (wrong biometric / user cancelled) — no alert needed, the
    // system's own prompt already told them what happened.
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    await syncOfflineClockQueue()
    await loadQueueInfo()
    setSyncing(false)
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={16} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Settings</Text>

        {/* Sync status */}
        <View style={styles.sectionHeader}>
          <RefreshCw size={13} color="#94A3B8" />
          <Text style={styles.sectionTitle}>Sync</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>
                {pendingCount === 0 ? "All synced" : `${pendingCount} pending action${pendingCount === 1 ? "" : "s"}`}
              </Text>
              <Text style={styles.rowSub}>
                {pendingCount === 0
                  ? "Clock-ins/outs saved offline are synced automatically."
                  : "Will sync automatically once you're back online."}
                {lastSyncedAt ? `  •  Last synced ${timeAgo(lastSyncedAt)}` : ""}
              </Text>
            </View>
            <Pressable style={styles.syncButton} onPress={handleSyncNow} disabled={syncing}>
              {syncing ? <ActivityIndicator size="small" color="#1E3A5F" /> : <Text style={styles.syncButtonText}>Sync now</Text>}
            </Pressable>
          </View>
        </View>

        {/* Alerts */}
        <View style={styles.sectionHeader}>
          <Bell size={13} color="#94A3B8" />
          <Text style={styles.sectionTitle}>Alerts</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Shift End Alert</Text>
              <Text style={styles.rowSub}>
                Get a short sound and vibration when your scheduled shift time has been reached.
              </Text>
            </View>
            {shiftEndAlert !== null && (
              <Switch value={shiftEndAlert} onValueChange={toggleShiftEndAlert} trackColor={{ true: "#1E3A5F" }} />
            )}
          </View>
        </View>

        {/* Security */}
        <View style={styles.sectionHeader}>
          <ShieldCheck size={13} color="#94A3B8" />
          <Text style={styles.sectionTitle}>Security</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>App Lock</Text>
              <Text style={styles.rowSub}>
                Require Face ID, fingerprint, or your device passcode to open OnClockly.
              </Text>
            </View>
            {appLockBusy ? (
              <ActivityIndicator size="small" color="#1E3A5F" />
            ) : (
              appLock !== null && (
                <Switch value={appLock} onValueChange={toggleAppLock} trackColor={{ true: "#1E3A5F" }} />
              )
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { flex: 1, padding: 16, gap: 16 },

  backButton: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  backText: { fontSize: 14, fontWeight: "600", color: "#64748B" },

  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  rowSub: { fontSize: 12, color: "#94A3B8", marginTop: 3, lineHeight: 17 },

  syncButton: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 84,
  },
  syncButtonText: { fontSize: 12, fontWeight: "700", color: "#1E3A5F" },
})

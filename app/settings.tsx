import { useRouter } from "expo-router"
import { Bell, ChevronLeft } from "lucide-react-native"
import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Switch, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { queryClient } from "@/lib/queryClient"
import {
  isShiftEndAlertEnabled,
  reconcileShiftEndAlert,
  setShiftEndAlertEnabled,
} from "@/services/shiftEndAlert"

export default function SettingsScreen() {
  const router = useRouter()
  const [shiftEndAlert, setShiftEndAlert] = useState<boolean | null>(null)

  useEffect(() => {
    isShiftEndAlertEnabled().then(setShiftEndAlert)
  }, [])

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

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={16} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Settings</Text>

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
              <Switch
                value={shiftEndAlert}
                onValueChange={toggleShiftEndAlert}
                trackColor={{ true: "#1E3A5F" }}
              />
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
})

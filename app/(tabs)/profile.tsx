import { useAuth } from "@/context/AuthContext"
import { router } from "expo-router"
import { ArrowRight } from "lucide-react-native"
import { useState } from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false)
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    setLoading(true)
    await logout()
    router.replace("/login")
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View style={{ padding: 24, gap: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: "600", color: "#0F172A" }}>Profile</Text>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "500" }}>NAME</Text>
          <Text style={{ fontSize: 16, color: "#0F172A" }}>{user?.fullname}</Text>
        </View>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "500" }}>EMAIL</Text>
          <Text style={{ fontSize: 16, color: "#0F172A" }}>{user?.email}</Text>
        </View>

        <Pressable
          onPress={handleLogout}
          disabled={loading}
          style={({ pressed }) => ({
            height: 46,
            borderRadius: 12,
            backgroundColor: "#1E3A5F",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: loading ? 0.7 : pressed ? 0.9 : 1,
          })}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Signing out…</Text>
            </>
          ) : (
            <>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Log out</Text>
              <ArrowRight size={15} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

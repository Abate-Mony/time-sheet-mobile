import { useAuth } from "@/context/AuthContext"
import { isAxiosError } from "axios"
import { useRouter } from "expo-router"
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react-native"
import { useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import customFetch from "../utils/customFetch"
import type { User } from "../utils/types"

export default function Login() {
  const router = useRouter()
  const { login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const errs: { email?: string; password?: string } = {}
    if (!email) errs.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address"
    if (!password) errs.password = "Password is required"
    else if (password.length < 6) errs.password = "Password must be at least 6 characters"
    return errs
  }

  const handleLogin = async () => {
    setError("")
    const errs = validate()
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setLoading(true)

    try {
      const { data } = await customFetch.post<{ user: User; accessToken: string; refreshToken: string }>(
        "/auth/mobile/login",
        {
          email: email.trim().toLowerCase(),
          password,
        }
      )
      await login(data.accessToken, data.refreshToken, data.user)
      router.replace("/(tabs)")
    
    } catch (err) {
      console.error("Login error:", err) // Debugging log
      const msg = isAxiosError(err)
        ? err.response?.data?.msg ??
          err.response?.data?.message ??
          (err.response ? `Login failed (${err.response.status})` : "Cannot connect to the server")
        : "Something went wrong"
      setError(typeof msg === "string" ? msg : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: "#3B82F6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>W</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#0F172A" }}>
              work<Text style={{ color: "#3B82F6" }}>.wrk</Text>
            </Text>
          </View>

          {/* Heading */}
          <View style={{ marginBottom: 28 }}
          
          >
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#0F172A", marginBottom: 6 }}>
              Welcome back
            </Text>
            <Text style={{ fontSize: 14, color: "#64748B" }}>
              Sign in to your account to continue
            </Text>
          </View>

          {/* Error alert */}
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
                marginBottom: 20,
              }}
            >
              <AlertCircle size={15} color="#EF4444" style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 14, color: "#B91C1C" }}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={v => {
                setEmail(v)
                setFieldErrors(e => ({ ...e, email: undefined }))
              }}
              placeholder="you@company.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
              style={{
                height: 46,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: fieldErrors.email ? "#F87171" : "#E2E8F0",
                backgroundColor: "#FFFFFF",
                fontSize: 14,
                color: "#1E293B",
              }}
            />
            {fieldErrors.email ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                <AlertCircle size={11} color="#EF4444" />
                <Text style={{ fontSize: 12, color: "#EF4444" }}>{fieldErrors.email}</Text>
              </View>
            ) : null}
          </View>

          {/* Password */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              Password
            </Text>
            <View style={{ position: "relative" }}>
              <TextInput
                value={password}
                onChangeText={v => {
                  setPassword(v)
                  setFieldErrors(e => ({ ...e, password: undefined }))
                }}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
                style={{
                  height: 46,
                  paddingHorizontal: 14,
                  paddingRight: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: fieldErrors.password ? "#F87171" : "#E2E8F0",
                  backgroundColor: "#FFFFFF",
                  fontSize: 14,
                  color: "#1E293B",
                }}
              />
              <Pressable
                onPress={() => setShowPassword(s => !s)}
                style={{ position: "absolute", right: 12, top: 13 }}
                hitSlop={8}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#94A3B8" />
                ) : (
                  <Eye size={18} color="#94A3B8" />
                )}
              </Pressable>
            </View>
            {fieldErrors.password ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                <AlertCircle size={11} color="#EF4444" />
                <Text style={{ fontSize: 12, color: "#EF4444" }}>{fieldErrors.password}</Text>
              </View>
            ) : null}
          </View>

          {/* Forgot password */}
          <Pressable style={{ alignSelf: "flex-end", marginBottom: 20 }} hitSlop={8}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#2563EB" }}>
              Forgot password?
            </Text>
          </Pressable>

          {/* Sign in button */}
          <Pressable
            onPress={handleLogin}
            // onPress={()=>{
            //    router.replace("/(tabs)")
            // }}
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
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Signing in…</Text>
              </>
            ) : (
              <>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Sign in</Text>
                <ArrowRight size={15} color="#fff" />
              </>
            )}
          </Pressable>

          <Text style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 28 }}>
            Contact your manager if you need an account
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

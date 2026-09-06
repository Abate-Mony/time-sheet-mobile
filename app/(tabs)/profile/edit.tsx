import { useAuth } from "@/context/AuthContext"
import { updateWorkerProfile } from "@/utils/api-request-functions"
import { editProfileSchema } from "@/utils/schema"
import type { EditProfileForm, EditProfileFormInput, User } from "@/utils/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import { Controller, useForm } from "react-hook-form"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const GENDER_OPTIONS: NonNullable<User["gender"]>[] = ["Male", "Female", "Other", "Prefer not to say"]

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <Text style={styles.fieldError}>{message}</Text>
}

export default function EditProfileScreen() {
  const router = useRouter()
  const { user, updateUser } = useAuth()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileFormInput, unknown, EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      fullname: user?.fullname ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      gender: user?.gender ?? "",
    },
  })

  const onSubmit = async (data: EditProfileForm) => {
    const updated = await updateWorkerProfile(data)
    if (updated) {
      await updateUser(updated)
      router.back()
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={16} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your personal details</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <Controller
              control={control}
              name="fullname"
              render={({ field: { value, onChange } }) => (
                <TextInput style={styles.input} value={value} onChangeText={onChange} />
              )}
            />
            <FieldError message={errors.fullname?.message} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />
            <FieldError message={errors.email?.message} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            <Controller
              control={control}
              name="phone"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value ?? ""}
                  onChangeText={onChange}
                  keyboardType="phone-pad"
                />
              )}
            />
            <FieldError message={errors.phone?.message} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Gender</Text>
            <Controller
              control={control}
              name="gender"
              render={({ field: { value, onChange } }) => (
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map(option => (
                    <Pressable
                      key={option}
                      onPress={() => onChange(value === option ? "" : option)}
                      style={[styles.genderChip, value === option && styles.genderChipActive]}
                    >
                      <Text style={[styles.genderChipText, value === option && styles.genderChipTextActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
            <FieldError message={errors.gender?.message} />
          </View>

          <Pressable
            style={[styles.saveButton, isSubmitting && styles.disabled]}
            disabled={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },

  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#94A3B8",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 20,
    gap: 16,
  },

  field: {
    gap: 6,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },

  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    fontSize: 14,
    color: "#1E293B",
  },

  fieldError: {
    fontSize: 12,
    color: "#EF4444",
  },

  genderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  genderChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  genderChipActive: {
    backgroundColor: "#1E3A5F",
    borderColor: "#1E3A5F",
  },

  genderChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },

  genderChipTextActive: {
    color: "#FFFFFF",
  },

  saveButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  disabled: {
    opacity: 0.6,
  },
})

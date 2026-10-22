import { useAuth } from "@/context/AuthContext";
import { submitRestrictionAppeal, uploadMyDocument } from "@/utils/api-request-functions";
import { fmtDate, REASON_LABELS, type AccountRestriction } from "@/utils/restriction";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  Check,
  FileUp,
  LogOut,
  MessageSquare,
  Scale,
  ShieldAlert,
  Upload,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// A fully suspended worker (accessLevel "none") is blocked from everything
// else in the app — this is a self-contained screen, not a navigation into
// the main tabs, so the remedy actions (appeal, document upload) are built
// inline here rather than deep-linking into gated screens.
export function SuspendedOverlay({ restriction }: { restriction: AccountRestriction }) {
  const { logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [view, setView] = useState<"main" | "appeal" | "upload">("main");
  const [appealMessage, setAppealMessage] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [uploadDone, setUploadDone] = useState(false);

  const appealSubmitted = restriction.appeal?.status === "pending";

  const uploadMutation = useMutation({
    mutationFn: uploadMyDocument,
    onSuccess: () => setUploadDone(true),
  });

  const handleSignOut = async () => {
    await logout();
    router.replace("/login");
  };

  const handleSubmitAppeal = async () => {
    if (!appealMessage.trim()) return;
    setSubmittingAppeal(true);
    const ok = await submitRestrictionAppeal(appealMessage.trim());
    setSubmittingAppeal(false);
    if (ok) {
      queryClient.invalidateQueries({ queryKey: ["my-restriction"] });
      setView("main");
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ALLOWED_TYPES, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.size != null && asset.size > MAX_FILE_BYTES) return;
    setPendingFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? "application/octet-stream" });
  };

  const handleUpload = () => {
    if (!pendingFile) return;
    uploadMutation.mutate({
      name: "Document submitted for restriction review",
      uri: pendingFile.uri,
      fileName: pendingFile.name,
      mimeType: pendingFile.mimeType,
    });
  };

  return (
    <Modal visible animationType="none" statusBarTranslucent presentationStyle="fullScreen">
      <View style={styles.screen}>
        <SafeAreaView style={styles.flex1} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <View style={styles.logoDot}>
              <Text style={styles.logoDotText}>O</Text>
            </View>
            <Text style={styles.logoText}>
              On<Text style={styles.logoAccent}>Clockly</Text>
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {view === "main" && (
              <>
                <View style={styles.iconCircle}>
                  <ShieldAlert size={28} color="#F87171" />
                </View>
                <Text style={styles.title}>Your account is temporarily suspended</Text>
                <Text style={styles.subtitle}>
                  You can still see why access was suspended and use the options below.
                </Text>

                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Reason</Text>
                    <Text style={styles.infoValue}>{REASON_LABELS[restriction.reason]}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Suspended</Text>
                    <View style={styles.infoValueRow}>
                      <CalendarDays size={11} color="rgba(255,255,255,0.3)" />
                      <Text style={styles.infoValue}>{fmtDate(restriction.startsAt)}</Text>
                    </View>
                  </View>
                  {restriction.expiresAt && (
                    <View style={[styles.infoRow, styles.infoRowLast]}>
                      <Text style={styles.infoLabel}>Restriction ends</Text>
                      <Text style={styles.infoValue}>{fmtDate(restriction.expiresAt)}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.messageCard}>
                  <Text style={styles.messageText}>{restriction.message}</Text>
                </View>

                <View style={styles.actions}>
                  {restriction.remedy === "upload_document" && (
                    <Pressable style={styles.primaryButton} onPress={() => setView("upload")}>
                      <Upload size={15} color="#0A1628" />
                      <Text style={styles.primaryButtonText}>Upload document</Text>
                    </Pressable>
                  )}
                  {restriction.canAppeal && !appealSubmitted && (
                    <Pressable style={styles.secondaryButton} onPress={() => setView("appeal")}>
                      <Scale size={15} color="#FFFFFF" />
                      <Text style={styles.secondaryButtonText}>Submit appeal</Text>
                    </Pressable>
                  )}
                  {appealSubmitted && (
                    <View style={styles.appealPendingBanner}>
                      <Scale size={14} color="#60A5FA" />
                      <View style={styles.flex1}>
                        <Text style={styles.appealPendingTitle}>Appeal submitted</Text>
                        <Text style={styles.appealPendingText}>Waiting for manager review.</Text>
                      </View>
                    </View>
                  )}
                  {restriction.remedy === "contact_manager" && (
                    <View style={styles.contactBanner}>
                      <MessageSquare size={14} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.contactBannerText}>Contact your manager directly to resolve this.</Text>
                    </View>
                  )}
                </View>

                <Pressable style={styles.signOutButton} onPress={handleSignOut}>
                  <LogOut size={14} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.signOutText}>Sign out</Text>
                </Pressable>
              </>
            )}

            {view === "appeal" && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Submit an appeal</Text>
                <Text style={styles.formSubtitle}>Explain why you think this restriction should be reviewed.</Text>
                <TextInput
                  value={appealMessage}
                  onChangeText={setAppealMessage}
                  placeholder="Describe your situation…"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  numberOfLines={5}
                  style={styles.textArea}
                />
                <Text style={styles.formNote}>Your message will be sent to your manager.</Text>
                <View style={styles.formActions}>
                  <Pressable style={styles.formCancelButton} onPress={() => setView("main")}>
                    <Text style={styles.formCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.formSubmitButton, (!appealMessage.trim() || submittingAppeal) && styles.disabled]}
                    onPress={handleSubmitAppeal}
                    disabled={!appealMessage.trim() || submittingAppeal}
                  >
                    {submittingAppeal ? (
                      <ActivityIndicator color="#0A1628" size="small" />
                    ) : (
                      <Text style={styles.formSubmitText}>Submit appeal</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {view === "upload" && (
              <View style={styles.formCard}>
                {uploadDone ? (
                  <View style={styles.uploadDoneWrap}>
                    <View style={styles.uploadDoneIcon}>
                      <Check size={22} color="#34D399" />
                    </View>
                    <Text style={styles.formTitle}>Document submitted</Text>
                    <Text style={styles.formSubtitle}>
                      Your manager will review it. Your current restriction remains until approved.
                    </Text>
                    <Pressable style={styles.formSubmitButton} onPress={() => setView("main")}>
                      <Text style={styles.formSubmitText}>Done</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Text style={styles.formTitle}>Upload document</Text>
                    <Text style={styles.formSubtitle}>PDF, JPG or PNG, up to 10MB.</Text>
                    <Pressable style={styles.filePicker} onPress={pickFile}>
                      <FileUp size={20} color={pendingFile ? "#34D399" : "rgba(255,255,255,0.4)"} />
                      <Text style={[styles.filePickerText, pendingFile && styles.filePickerTextDone]} numberOfLines={1}>
                        {pendingFile ? pendingFile.name : "Choose file"}
                      </Text>
                    </Pressable>
                    <View style={styles.formActions}>
                      <Pressable style={styles.formCancelButton} onPress={() => setView("main")}>
                        <Text style={styles.formCancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.formSubmitButton, (!pendingFile || uploadMutation.isPending) && styles.disabled]}
                        onPress={handleUpload}
                        disabled={!pendingFile || uploadMutation.isPending}
                      >
                        {uploadMutation.isPending ? (
                          <ActivityIndicator color="#0A1628" size="small" />
                        ) : (
                          <Text style={styles.formSubmitText}>Submit for review</Text>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0A1628" },
  flex1: { flex: 1 },

  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  logoDot: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center" },
  logoDotText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  logoText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16, letterSpacing: -0.2 },
  logoAccent: { color: "#60A5FA" },

  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20, paddingTop: 24 },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", textAlign: "center" },
  subtitle: { marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 19, maxWidth: 320 },

  infoCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 12, color: "rgba(255,255,255,0.45)" },
  infoValue: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
  infoValueRow: { flexDirection: "row", alignItems: "center", gap: 5 },

  messageCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
  },
  messageText: { fontSize: 13, color: "#FCD34D", lineHeight: 19 },

  actions: { width: "100%", maxWidth: 340, gap: 10, marginTop: 12 },
  primaryButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: { fontSize: 14, fontWeight: "700", color: "#0A1628" },
  secondaryButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },

  appealPendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(59,130,246,0.15)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  appealPendingTitle: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  appealPendingText: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 },

  contactBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  contactBannerText: { flex: 1, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 17 },

  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 44,
    marginTop: 20,
  },
  signOutText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.4)" },

  formCard: { width: "100%", maxWidth: 340 },
  formTitle: { fontSize: 17, fontWeight: "800", color: "#FFFFFF", textAlign: "center" },
  formSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 6, lineHeight: 18 },

  textArea: {
    marginTop: 16,
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#FFFFFF",
    fontSize: 14,
    padding: 14,
    textAlignVertical: "top",
  },
  formNote: { fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 8, textAlign: "center" },

  filePicker: {
    marginTop: 18,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  filePickerText: { fontSize: 13, color: "rgba(255,255,255,0.5)", flexShrink: 1 },
  filePickerTextDone: { color: "#34D399", fontWeight: "600" },

  formActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  formCancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  formCancelText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  formSubmitButton: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  formSubmitText: { fontSize: 13, fontWeight: "700", color: "#0A1628" },
  disabled: { opacity: 0.4 },

  uploadDoneWrap: { alignItems: "center" },
  uploadDoneIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "rgba(52,211,153,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
});

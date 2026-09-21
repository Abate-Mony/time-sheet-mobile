import { deleteMyDocument, getMyDocuments, uploadMyDocument } from "@/utils/api-request-functions";
import type { WorkerDocument } from "@/utils/types";
import { isAxiosError } from "axios";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";

// Same restriction as the backend (multerMiddleware.ts) and web's <input
// accept="...">  — kept in sync so a worker finds out a file won't work
// before spending time picking a name for it, not after the upload 400s.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type PendingFile = { uri: string; name: string; mimeType: string; size?: number };

export default function WorkerDocumentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [docName, setDocName] = useState("");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["my-documents"],
    queryFn: getMyDocuments,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadMyDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-documents"] });
      Toast.show({ type: "success", text1: "Document uploaded" });
      setPendingFile(null);
      setDocName("");
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? error.response?.data?.msg ?? "Couldn't upload — try again."
        : "Couldn't upload — try again.";
      Toast.show({ type: "error", text1: message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMyDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-documents"] });
      Toast.show({ type: "success", text1: "Document removed" });
    },
    onError: () => Toast.show({ type: "error", text1: "Couldn't remove the document — try again." }),
  });

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_TYPES,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (asset.size != null && asset.size > MAX_FILE_BYTES) {
      Toast.show({ type: "error", text1: "That file is too large — 10MB max." });
      return;
    }

    setPendingFile({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
      size: asset.size ?? undefined,
    });
    // Default the name from the filename (without extension) so most workers
    // never have to type anything — they can still rename it before uploading.
    if (!docName) setDocName(asset.name.replace(/\.[^/.]+$/, ""));
  };

  const cancelPending = () => {
    setPendingFile(null);
    setDocName("");
  };

  const handleUpload = () => {
    if (!pendingFile) return;
    if (!docName.trim()) {
      Toast.show({ type: "error", text1: "Give the document a name." });
      return;
    }
    uploadMutation.mutate({
      name: docName.trim(),
      uri: pendingFile.uri,
      fileName: pendingFile.name,
      mimeType: pendingFile.mimeType,
    });
  };

  const confirmDelete = (doc: WorkerDocument) => {
    Alert.alert("Remove document?", `"${doc.name}" will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteMutation.mutate(doc._id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={17} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Paperclip size={15} color="#64748B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>My Documents</Text>
            <Text style={styles.subtitle}>
              Optional — upload ID, right-to-work, certifications, or anything else your manager may ask for.
            </Text>
          </View>
        </View>

        {/* Upload */}
        <View style={styles.uploadCard}>
          {!pendingFile ? (
            <Pressable style={styles.pickButton} onPress={pickFile}>
              <Upload size={14} color="#64748B" />
              <Text style={styles.pickButtonText}>Choose a file to upload</Text>
            </Pressable>
          ) : (
            <>
              <View style={styles.pendingFileRow}>
                <FileText size={14} color="#64748B" />
                <Text style={styles.pendingFileName} numberOfLines={1}>
                  {pendingFile.name}
                </Text>
              </View>
              <TextInput
                value={docName}
                onChangeText={setDocName}
                placeholder="Document name (e.g. Passport, DBS Certificate)"
                placeholderTextColor="#94A3B8"
                style={styles.nameInput}
              />
              <View style={styles.pendingActions}>
                <Pressable style={styles.cancelButton} onPress={cancelPending} disabled={uploadMutation.isPending}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.uploadButton, uploadMutation.isPending && styles.disabled]}
                  onPress={handleUpload}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* List */}
        {isLoading ? (
          <View style={styles.listCard}>
            <ActivityIndicator size="small" color="#1E3A5F" style={{ paddingVertical: 20 }} />
          </View>
        ) : documents.length === 0 ? (
          <Text style={styles.emptyText}>No documents uploaded yet.</Text>
        ) : (
          <View style={styles.listCard}>
            {documents.map((doc, index) => (
              <View key={doc._id} style={[styles.docRow, index < documents.length - 1 && styles.docRowBorder]}>
                <View style={styles.docIcon}>
                  {doc.mimeType === "application/pdf" ? (
                    <FileText size={14} color="#64748B" />
                  ) : (
                    <ImageIcon size={14} color="#64748B" />
                  )}
                </View>
                <Pressable style={styles.flex1} onPress={() => Linking.openURL(doc.url)}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Text style={styles.docDate}>{new Date(doc.uploadedAt).toLocaleDateString()}</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(doc)}
                  disabled={deleteMutation.isPending}
                  hitSlop={8}
                >
                  <Trash2 size={14} color="#CBD5E1" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  backButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 3 },
  backText: { color: "#64748B", fontSize: 14, fontWeight: "600" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  headerIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  subtitle: { marginTop: 3, fontSize: 12, color: "#94A3B8", lineHeight: 17 },
  uploadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 10,
  },
  pickButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 16,
  },
  pickButtonText: { fontSize: 13, fontWeight: "500", color: "#64748B" },
  pendingFileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pendingFileName: { flex: 1, fontSize: 12, color: "#64748B" },
  nameInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#0F172A",
  },
  pendingActions: { flexDirection: "row", gap: 8 },
  cancelButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  uploadButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  disabled: { opacity: 0.6 },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  docRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  docIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  docName: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  docDate: { marginTop: 2, fontSize: 12, color: "#94A3B8" },
  flex1: { flex: 1 },
  emptyText: { fontSize: 13, color: "#94A3B8", textAlign: "center", paddingVertical: 24 },
});

import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import customFetch from "@/utils/customFetch";
import { formatDate } from "@/utils/date";
import { buildMapUrl, MAP_SERVICES, type MapService } from "@/utils/mapLinks";
import type { MyLocationsResponse, WorkLocation } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { AlertCircle, Building2, ChevronLeft, MapPin, Navigation } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Apple Maps' web fallback (maps.apple.com) is a real navigation handoff on
// iOS but just opens a webpage on Android — not worth offering there (same
// as jobs/[id].tsx's own map picker).
const AVAILABLE_MAP_SERVICES = Platform.OS === "android" ? MAP_SERVICES.filter(s => s.id !== "apple") : MAP_SERVICES;

function LocationRow({ location, onNavigate }: { location: WorkLocation; onNavigate: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <Building2 size={16} color="#0284C7" />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.name} numberOfLines={1}>{location.location}</Text>
        {!!location.address && (
          <Text style={styles.address} numberOfLines={1}>{location.address}</Text>
        )}
        <Text style={styles.meta}>
          {location.visitCount} shift{location.visitCount === 1 ? "" : "s"} · last {formatDate(location.lastWorkedAt, "D MMM YYYY")}
        </Text>
      </View>
      <Pressable onPress={onNavigate} hitSlop={8} style={styles.navButton}>
        <Navigation size={14} color="#1E3A5F" />
      </Pressable>
    </View>
  );
}

export default function WorkLocationsScreen() {
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const [pickerFor, setPickerFor] = useState<WorkLocation | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["my-locations"],
    queryFn: async () => {
      const { data } = await customFetch.get<MyLocationsResponse>("/workers/me/locations");
      return data;
    },
  });

  const locations = data?.locations ?? [];

  const openWith = (service: MapService) => {
    if (!pickerFor) return;
    const url = buildMapUrl(service, {
      lat: pickerFor.coordinates?.lat,
      lng: pickerFor.coordinates?.lng,
      address: pickerFor.address || pickerFor.location,
    });
    setPickerFor(null);
    if (url) Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={18} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Work Locations</Text>
        <Text style={styles.subtitle}>Sites you&apos;ve been scheduled to</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#1E3A5F" />}
      >
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#1E3A5F" />
        ) : isError || !data ? (
          <View style={styles.empty}>
            <AlertCircle size={20} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Couldn&apos;t load your locations</Text>
            <Text style={styles.emptyText}>Pull to refresh or try again shortly.</Text>
          </View>
        ) : locations.length === 0 ? (
          <View style={styles.empty}>
            <MapPin size={20} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No locations yet</Text>
            <Text style={styles.emptyText}>Sites from your shifts will show up here once you've worked one.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {locations.map((loc, i) => (
              <View key={`${loc.location}-${loc.address}`} style={[styles.rowWrap, i < locations.length - 1 && styles.rowBorder]}>
                <LocationRow location={loc} onNavigate={() => setPickerFor(loc)} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!pickerFor} transparent animationType="fade" onRequestClose={() => setPickerFor(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerFor(null)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Navigate with</Text>
            {AVAILABLE_MAP_SERVICES.map(service => (
              <Pressable key={service.id} style={styles.modalOption} onPress={() => openWith(service.id)}>
                <Text style={styles.modalOptionText}>{service.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F5F5" },
  flex1: { flex: 1, minWidth: 0 },

  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 4 },
  backButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 2, marginBottom: 2 },
  backText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  title: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#94A3B8" },

  content: { padding: 16, paddingTop: 12, flexGrow: 1 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  rowWrap: { paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },

  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  address: { fontSize: 12, color: "#64748B", marginTop: 1 },
  meta: { fontSize: 11, color: "#94A3B8", marginTop: 3 },

  navButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },

  empty: { marginTop: 40, alignItems: "center", gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#334155" },
  emptyText: { fontSize: 12, color: "#94A3B8", textAlign: "center" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
    gap: 4,
  },
  modalTitle: { fontSize: 13, fontWeight: "700", color: "#64748B", marginBottom: 6, paddingHorizontal: 8 },
  modalOption: { paddingHorizontal: 8, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  modalOptionText: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
});

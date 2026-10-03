import { useOpenShifts } from "@/hooks/useOpenShifts";
import { claimOpenShift, takeShiftGiveaway } from "@/utils/api-request-functions";
import { formatDate, formatDuration } from "@/utils/date";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertCircle, CalendarClock } from "lucide-react-native";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

type InfoRowProps = {
  label: string;
  value: string;
};

const InfoRow = ({ label, value }: InfoRowProps) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

export default function OpenShiftDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: shifts, isLoading, isError, refetch, isRefetching } = useOpenShifts();
  const [claiming, setClaiming] = useState(false);

  const shift = shifts?.find((s) => s._id === id);

  const claim = async () => {
    if (!shift) return;
    setClaiming(true);
    const ok = shift.giveaway
      ? await takeShiftGiveaway(shift.giveaway.assignmentId)
      : await claimOpenShift(shift._id);
    setClaiming(false);
    if (ok) router.back();
  };

  const share = () => {
    if (!shift) return;
    const lines = [
      shift.title,
      shift.client?.name,
      `${formatDate(shift.date, "dddd, D MMM YYYY")} · ${shift.startTime}–${shift.endTime}`,
      shift.location,
      shift.payRate ? `£${shift.payRate}/hr` : undefined,
    ].filter(Boolean);
    Share.share({ message: lines.join("\n") });
  };

  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>

      {!!shift && (
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{shift.giveaway ? "Up for grabs" : "Open"}</Text>
        </View>
      )}
    </View>
  );

  if (isLoading || isError || !shift) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        >
          {header}
          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#2563EB" />
          ) : (
            <View style={styles.empty}>
              {isError ? (
                <AlertCircle size={20} color="#94A3B8" />
              ) : (
                <CalendarClock size={20} color="#94A3B8" />
              )}
              <Text style={styles.emptyTitle}>
                {isError ? "Couldn't load this shift" : "Shift no longer available"}
              </Text>
              <Text style={styles.emptyText}>
                {isError
                  ? "Pull to refresh or try again shortly."
                  : "It may have been claimed by someone else or removed by your manager."}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const address = shift.address;
  const details = [
    { title: `Note from ${shift.giveaway?.offeredBy}`, text: shift.giveaway?.note },
    { title: "Description", text: shift.description },
    { title: "Instructions", text: shift.instructions },
    { title: "Site Access", text: shift.siteSnapshot?.accessInstructions },
    { title: "Parking", text: shift.siteSnapshot?.parkingInstructions },
    { title: "Notes", text: shift.notes },
  ].filter((d) => !!d.text?.trim());

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      >
        {header}

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>
            {shift.giveaway ? `Offered by ${shift.giveaway.offeredBy}` : "Open Shift"}
          </Text>
          <Text style={styles.title}>{shift.title}</Text>
          {!!shift.client?.name && <Text style={styles.subtitle}>{shift.client.name}</Text>}

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{formatDate(shift.date, "dddd, D MMM YYYY")}</Text>
            <Text style={styles.metaText}>•</Text>
            <Text style={styles.metaText}>
              {shift.startTime} – {shift.endTime}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shift Summary</Text>
          {!!shift.payRate && <InfoRow label="Pay" value={`£${shift.payRate}/hr`} />}
          {!!shift.minutes && <InfoRow label="Duration" value={formatDuration(shift.minutes)} />}
          {!!shift.location && <InfoRow label="Location" value={shift.location} />}
          {!!address && address !== shift.location && <InfoRow label="Address" value={address} />}
          {!!shift.requiredWorkers && (
            <InfoRow
              label="Staff Needed"
              value={`${shift.requiredWorkers} ${shift.requiredWorkers === 1 ? "person" : "people"}`}
            />
          )}
        </View>

        {details.map((d) => (
          <View key={d.title} style={styles.card}>
            <Text style={styles.cardTitle}>{d.title}</Text>
            <Text style={styles.noteText}>{d.text}</Text>
          </View>
        ))}

        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryButton} onPress={share}>
            <Text style={styles.secondaryButtonText}>Share</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, claiming && styles.disabled]}
            disabled={claiming}
            onPress={claim}
          >
            {claiming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>{shift.giveaway ? "Take shift" : "Claim shift"}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:"#F5F7FB",
    paddingBottom: 100,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#EAF0FF",
  },
  backButtonText: {
    color: "#1F3A8A",
    fontWeight: "600",
    fontSize: 14,
  },
  statusBadge: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: "#166534",
    fontWeight: "700",
    fontSize: 12,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  eyebrow: {
    color: "#5B6B8A",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: "#374151",
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 8,
    flexWrap: "wrap",
  },
  metaText: {
    color: "#475467",
    fontSize: 14,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  infoLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
    marginLeft: 12,
  },
  noteText: {
    color: "#475467",
    fontSize: 15,
    lineHeight: 24,
  },
  empty: {
    marginTop: 40,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    flex: 0.5,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#1E3A8A",
    fontWeight: "700",
    fontSize: 15,
  },
  disabled: {
    opacity: 0.6,
  },
});

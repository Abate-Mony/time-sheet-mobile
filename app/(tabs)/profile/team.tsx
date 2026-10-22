import { Avatar } from "@/components/avatar";
import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import customFetch from "@/utils/customFetch";
import type { MyTeamResponse, TeamMate } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { AlertCircle, ChevronLeft, Users } from "lucide-react-native";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ROLE_LABEL: Record<TeamMate["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  worker: "Worker",
};

const ROLE_ORDER: Record<TeamMate["role"], number> = { owner: 0, admin: 1, manager: 2, worker: 3 };

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();

function TeamRow({ mate }: { mate: TeamMate }) {
  return (
    <View style={styles.row}>
      <Avatar initials={initialsOf(mate.fullname)} src={mate.photoUrl} />
      <View style={styles.flex1}>
        <Text style={styles.name} numberOfLines={1}>{mate.fullname}</Text>
      </View>
      <View style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>{ROLE_LABEL[mate.role] ?? mate.role}</Text>
      </View>
    </View>
  );
}

export default function TeamDirectoryScreen() {
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["my-team"],
    queryFn: async () => {
      const { data } = await customFetch.get<MyTeamResponse>("/workers/me/team");
      return data;
    },
  });

  const teammates = data?.teammates ?? [];

  // Grouped by role for easier scanning on a larger company roster — a
  // flat alphabetical list would bury the one owner/admin somewhere in the
  // middle of a long worker list.
  const groups = (["owner", "admin", "manager", "worker"] as const)
    .map(role => ({ role, members: teammates.filter(m => m.role === role) }))
    .filter(g => g.members.length > 0);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={18} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Team Directory</Text>
        <Text style={styles.subtitle}>Everyone at your company</Text>
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
            <Text style={styles.emptyTitle}>Couldn&apos;t load your team</Text>
            <Text style={styles.emptyText}>Pull to refresh or try again shortly.</Text>
          </View>
        ) : teammates.length === 0 ? (
          <View style={styles.empty}>
            <Users size={20} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No other teammates yet</Text>
            <Text style={styles.emptyText}>Anyone else your company adds will show up here.</Text>
          </View>
        ) : (
          groups.map(group => (
            <View key={group.role} style={styles.group}>
              <Text style={styles.sectionTitle}>{ROLE_LABEL[group.role]}{group.members.length > 1 ? "s" : ""}</Text>
              <View style={styles.card}>
                {group.members.map((m, i) => (
                  <View key={m._id} style={[styles.rowWrap, i < group.members.length - 1 && styles.rowBorder]}>
                    <TeamRow mate={m} />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
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

  content: { padding: 16, paddingTop: 12, gap: 4, flexGrow: 1 },

  group: { marginBottom: 6 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },

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
  name: { fontSize: 15, fontWeight: "700", color: "#0F172A" },

  roleBadge: { backgroundColor: "#EFF6FF", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: { fontSize: 10, fontWeight: "700", color: "#1D4ED8" },

  empty: { marginTop: 40, alignItems: "center", gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#334155" },
  emptyText: { fontSize: 12, color: "#94A3B8", textAlign: "center" },
});

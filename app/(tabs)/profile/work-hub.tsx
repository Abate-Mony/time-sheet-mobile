import { useTabBarClearance } from "@/hooks/useTabBarClearance";
import { useRouter } from "expo-router";
import {
  Banknote,
  Building2,
  ChevronLeft,
  ChevronRight,
  FolderLock,
  MessageCircle,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type HubItem = {
  label: string;
  sub: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  to: string;
};

const HUB_ITEMS: HubItem[] = [
  {
    label: "Messages & Support",
    sub: "Reach your managers",
    icon: MessageCircle,
    color: "#2563EB",
    bg: "#EFF6FF",
    to: "/(tabs)/profile/contactmanager",
  },
  {
    label: "Documents & Credentials",
    sub: "IDs, certificates, policies",
    icon: FolderLock,
    color: "#7C3AED",
    bg: "#F5F3FF",
    to: "/(tabs)/profile/documents",
  },
  {
    label: "Payslips",
    sub: "Pay history and totals",
    icon: Banknote,
    color: "#0D9488",
    bg: "#F0FDFA",
    to: "/(tabs)/profile/earnings",
  },
  {
    label: "Team Directory",
    sub: "Managers and colleagues",
    icon: Users,
    color: "#0891B2",
    bg: "#ECFEFF",
    to: "/(tabs)/profile/team",
  },
  {
    label: "Work Locations",
    sub: "Sites you've worked",
    icon: Building2,
    color: "#0284C7",
    bg: "#F0F9FF",
    to: "/(tabs)/profile/locations",
  },
];

export default function WorkHubScreen() {
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={18} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Work Hub</Text>
        <Text style={styles.subtitle}>Everything you need beyond your shifts</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}>
        <View style={styles.grid}>
          {HUB_ITEMS.map(item => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.to as any)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                <item.icon size={18} color={item.color} />
              </View>
              <Text style={styles.cardLabel} numberOfLines={2}>{item.label}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardSub} numberOfLines={1}>{item.sub}</Text>
                <ChevronRight size={13} color="#CBD5E1" />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F5F5" },

  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 4 },
  backButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 2, marginBottom: 2 },
  backText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  title: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#94A3B8" },

  content: { padding: 16, paddingTop: 16 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47%",
    minHeight: 128,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    justifyContent: "space-between",
  },
  cardPressed: { opacity: 0.8 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: { marginTop: 14, fontSize: 13, fontWeight: "700", color: "#0F172A", lineHeight: 17 },
  cardFooter: { marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  cardSub: { flex: 1, fontSize: 11, color: "#94A3B8" },
});

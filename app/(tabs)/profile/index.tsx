import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  HelpCircle,
  LogOut,
  Paperclip,
  Phone,
  Zap,
} from "lucide-react-native";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import customFetch from "@/utils/customFetch";
import type { User } from "@/utils/types";
import type { WorkerDashboardStats } from "../../../utils/types/workerType.ts";

// replace this with your real auth context
import { useAuth } from "@/context/AuthContext";

export const workerDashboardstats = () => ({
  queryKey: ["worker-dashboard-stats"],

  queryFn: async () => {
    const { data } =
      await customFetch.get<WorkerDashboardStats>(
        "/workers/stats"
      );

    return data;
  },
});

export default function ProfileScreen() {
  const router = useRouter();

  const {
    user,
    logout,
  }: {
    user: User | null;
    logout: () => Promise<void>;
  } = useAuth();

  const {
    data,
    isLoading,
    refetch,
  } = useQuery(
    workerDashboardstats()
  );

  // Tab navigator keeps this screen mounted on switching away — refetch on
  // every return to the tab, not just the first mount, same fix as Home,
  // Jobs and Schedule.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (isLoading || !data) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const {
    jobStats,
    monthly,
    totalJobs,
  } = data;

  const jobCompleted =
    Object.values(jobStats as Record<string, number>).reduce<number>(
      (acc, next) => acc + Number(next),
      0
    );

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Do you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();

            router.replace("/login");
          },
        },
      ]
    );
  };

  const stats = [
    {
      label: "Total Jobs",
      value: jobCompleted,
      sub: "this month",
      icon: CheckCircle2,
      color: "#059669",
      bg: "#ECFDF5",
    },

    {
      label: "Job Completed",
      value: jobStats.completed,
      sub: "this month",
      icon: Clock,
      color: "#2563EB",
      bg: "#EFF6FF",
    },

    {
      label: "Job Decline",
      value: jobStats.declined,
      sub: "this month",
      icon: Clock,
      color: "#2563EB",
      bg: "#EFF6FF",
    },

    {
      label: "Job Inprogress",
      value:
        jobStats["in-progress"],
      sub: "this month",
      icon: Clock,
      color: "#2563EB",
      bg: "#EFF6FF",
    },

    {
      label: "Job Pending",
      value: jobStats.pending,
      sub: "this month",
      icon: Clock,
      color: "#2563EB",
      bg: "#EFF6FF",
    },

    {
      label: "Job Accepted",
      value: jobStats.accepted,
      sub: "this month",
      icon: Clock,
      color: "#2563EB",
      bg: "#EFF6FF",
    },
  ];

  const settings = [
    {
      label: "Download Timesheet",
      icon: Download,
      sub: "July 2025",
      to:
        "/(tabs)/profile/download-time-sheet",
    },

    {
      label:
        "Notification Preferences",
      icon: Bell,
      sub: "Job alerts, reminders",
      to:
        "/(tabs)/profile/notifications",
    },

    {
      label: "My Documents",
      icon: Paperclip,
      sub: "ID, right-to-work, certifications",
      to: "/(tabs)/profile/documents",
    },

    {
      label: "Help Centre",
      icon: HelpCircle,
      sub: "Guides and answers",
      to: "/(tabs)/profile/help",
    },

    {
      label: "Contact Manager",
      icon: Phone,
      sub: "Get in touch",
      to: undefined,
    },
  ];

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* Profile hero */}
        <View style={styles.profileCard}>
          <View style={styles.profileCover} />

          <View style={styles.profileBody}>
            <View
              style={styles.profileTop}
            >
              <View
                style={styles.avatarRing}
              >
                <Avatar
                  initials={user?.fullname?.slice(
                    0,
                    3
                  )}
                  src={user?.profilePhoto?.url}
                  size="xl"
                />
              </View>

              <Pressable
                onPress={() =>
                  router.push(
                    "/(tabs)/profile/edit"
                  )
                }
                style={
                  styles.editButton
                }
              >
                <Text
                  style={
                    styles.editButtonText
                  }
                >
                  Edit Profile
                </Text>
              </Pressable>
            </View>

            <Text
              style={styles.userName}
            >
              {user?.fullname}
            </Text>

            <Text
              style={styles.userRole}
            >
              {user?.role}
            </Text>
          </View>
        </View>

        {/* Earnings */}
        <View
          style={styles.earningsCard}
        >
          <View
            style={
              styles.earningsHeader
            }
          >
            <View>
              <Text
                style={
                  styles.earningsLabel
                }
              >
                EARNINGS THIS MONTH
              </Text>

              <Text
                style={
                  styles.earningsValue
                }
              >
                £{monthly.earnings}
              </Text>
            </View>

            <View
              style={styles.zapIcon}
            >
              <Zap
                size={19}
                color="#93C5FD"
              />
            </View>
          </View>

          <View
            style={styles.earningsStats}
          >
            <View
              style={
                styles.earningStat
              }
            >
              <Text
                style={
                  styles.earningStatValue
                }
              >
                {monthly.hoursWorked?.toFixed(
                  1
                )}
                h
              </Text>

              <Text
                style={
                  styles.earningStatLabel
                }
              >
                Hours
              </Text>
            </View>

            <View
              style={
                styles.earningStat
              }
            >
              <Text
                style={
                  styles.earningStatValue
                }
              >
                {jobStats.completed}
              </Text>

              <Text
                style={
                  styles.earningStatLabel
                }
              >
                Jobs
              </Text>
            </View>

            <View
              style={
                styles.earningStat
              }
            >
              <Text
                style={
                  styles.earningStatValue
                }
              >
                {monthly.averagePayRate ||
                  2}
              </Text>

              <Text
                style={
                  styles.earningStatLabel
                }
              >
                £/hr avg
              </Text>
            </View>
          </View>
        </View>

        {/* Horizontal stats */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.statsScroll
          }
        >
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <View
                key={stat.label}
                style={styles.statCard}
              >
                <View
                  style={[
                    styles.statIcon,
                    {
                      backgroundColor:
                        stat.bg,
                    },
                  ]}
                >
                  <Icon
                    size={17}
                    color={stat.color}
                  />
                </View>

                <Text
                  style={styles.statValue}
                >
                  {stat.value}
                </Text>

                <Text
                  style={styles.statLabel}
                >
                  {stat.label}
                </Text>

                <Text
                  style={styles.statSub}
                >
                  {stat.sub}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Settings */}
        <View
          style={styles.settingsCard}
        >
          {settings.map(
            (item, index) => {
              const Icon = item.icon;

              return (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    if (item.to) {
                      router.push(
                        item.to as any
                      );
                    }
                  }}
                  style={[
                    styles.settingsRow,

                    index <
                      settings.length -
                        1 &&
                      styles.settingsBorder,
                  ]}
                >
                  <View
                    style={
                      styles.settingsIcon
                    }
                  >
                    <Icon
                      size={15}
                      color="#64748B"
                    />
                  </View>

                  <View
                    style={styles.flex1}
                  >
                    <Text
                      style={
                        styles.settingsTitle
                      }
                    >
                      {item.label}
                    </Text>

                    <Text
                      style={
                        styles.settingsSub
                      }
                    >
                      {item.sub}
                    </Text>
                  </View>

                  <ChevronRight
                    size={15}
                    color="#CBD5E1"
                  />
                </Pressable>
              );
            }
          )}

          {/* Logout */}
          <Pressable
            onPress={handleLogout}
            style={styles.settingsRow}
          >
            <View
              style={styles.settingsIcon}
            >
              <LogOut
                size={15}
                color="#64748B"
              />
            </View>

            <View style={styles.flex1}>
              <Text
                style={
                  styles.logoutTitle
                }
              >
                Logout
              </Text>

              <Text
                style={
                  styles.settingsSub
                }
              >
                {user?.fullname}
              </Text>
            </View>

            <LogOut
              size={15}
              color="#F59E0B"
            />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#F8FAFC",
    },

    content: {
      padding: 16,
      gap: 16,
      paddingBottom: 32,
    },

    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      color: "#94A3B8",
      fontSize: 14,
    },

    profileCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      overflow: "hidden",

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.04,
      shadowRadius: 5,
      elevation: 2,
    },

    profileCover: {
      height: 80,
      backgroundColor: "#1E3A5F",
    },

    profileBody: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },

    profileTop: {
      marginTop: -32,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent:
        "space-between",
    },

    avatarRing: {
      width: 68,
      height: 68,
      borderRadius: 999,
      padding: 4,
      backgroundColor: "#FFFFFF",
    },

    editButton: {
      height: 34,
      paddingHorizontal: 14,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },

    editButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#475569",
    },

    userName: {
      fontSize: 17,
      fontWeight: "800",
      color: "#0F172A",
    },

    userRole: {
      marginTop: 3,
      fontSize: 14,
      color: "#64748B",
      textTransform: "capitalize",
    },

    earningsCard: {
      backgroundColor: "#1E3A5F",
      borderRadius: 18,
      padding: 20,
      overflow: "hidden",
    },

    earningsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 16,
    },

    earningsLabel: {
      fontSize: 11,
      fontWeight: "700",
      color:
        "rgba(255,255,255,0.55)",
      letterSpacing: 0.7,
    },

    earningsValue: {
      marginTop: 4,
      fontSize: 30,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    zapIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        "rgba(255,255,255,0.10)",
      alignItems: "center",
      justifyContent: "center",
    },

    earningsStats: {
      flexDirection: "row",
      gap: 10,
    },

    earningStat: {
      flex: 1,
      backgroundColor:
        "rgba(255,255,255,0.10)",
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: "center",
    },

    earningStatValue: {
      fontSize: 16,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    earningStatLabel: {
      marginTop: 3,
      fontSize: 10,
      color:
        "rgba(255,255,255,0.45)",
    },

    statsScroll: {
      gap: 12,
      paddingRight: 16,
    },

    statCard: {
      width: 180,
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      padding: 16,

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },

    statIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },

    statValue: {
      fontSize: 22,
      fontWeight: "800",
      color: "#0F172A",
    },

    statLabel: {
      marginTop: 3,
      fontSize: 12,
      color: "#475569",
      fontWeight: "600",
    },

    statSub: {
      marginTop: 2,
      fontSize: 10,
      color: "#94A3B8",
    },

    settingsCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      overflow: "hidden",
    },

    settingsRow: {
      minHeight: 66,
      paddingHorizontal: 18,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },

    settingsBorder: {
      borderBottomWidth: 1,
      borderBottomColor: "#F8FAFC",
    },

    settingsIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: "#F1F5F9",
      alignItems: "center",
      justifyContent: "center",
    },

    settingsTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#1E293B",
    },

    settingsSub: {
      marginTop: 3,
      fontSize: 12,
      color: "#94A3B8",
    },

    logoutTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#E11D48",
    },

    flex1: {
      flex: 1,
    },
  });
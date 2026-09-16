import { Tabs } from "expo-router"
import type { LucideIcon } from "lucide-react-native"
import { Briefcase, CalendarDays, Clock, Home, User } from "lucide-react-native"
import { Platform, Text, View } from "react-native"

const ACTIVE = "#1E3A5F"
const INACTIVE = "#94A3B8"

function TabIcon({
  Icon,
  focused,
  label,
}: {
  Icon: LucideIcon
  focused: boolean
  label: string
}) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", gap: 3, width: 64 }}>
      <Icon size={22} color={focused ? ACTIVE : INACTIVE} />
      <Text
        style={{
          fontSize: 10,
          fontWeight: "600",
          color: focused ? ACTIVE : INACTIVE,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

function CenterTabIcon({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", gap: 3, width: 64 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          marginTop: -30,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: ACTIVE,
          borderWidth: 4,
          borderColor: "#FFFFFF",
          shadowColor: ACTIVE,
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Icon size={24} color="#FFFFFF" />
      </View>
      <Text
        style={{
          fontSize: 10,
          fontWeight: "600",
          color: ACTIVE,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E2E8F0",
          borderTopWidth: 1,
          overflow: "visible",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={Home} focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={Briefcase} focused={focused} label="Jobs" />
          ),
        }}
      />
      <Tabs.Screen
        name="clock"
        options={{
          tabBarIcon: () => <CenterTabIcon Icon={Clock} label="Clock" />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={CalendarDays} focused={focused} label="Schedule" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={User} focused={focused} label="Profile" />
          ),
        }}
      />
    </Tabs>
  )
}

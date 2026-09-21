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
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: focused ? ACTIVE : "transparent",
          ...(focused
            ? {
              shadowColor: ACTIVE,
              shadowOpacity: 0.25,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }
            : {}),
        }}
      >
        <Icon size={15} color={focused ? "#FFFFFF" : INACTIVE} />
      </View>
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

export default function TabLayout() {
  return (
    <>
      <Tabs

        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            height: Platform.OS === "ios" ? 88 : 80,
            paddingTop: 20,
            paddingBottom: Platform.OS === "ios" ? 28 : 10,
            backgroundColor: "#FFFFFF",
            borderTopColor: "#E2E8F0",
            borderTopWidth: 1,
            display: "flex",
            width: "100%",
            borderRadius: 0,
            // borderTopRightRadius:20,
            // borderTopLeftRadius:20,
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
            tabBarIcon: ({ focused }) => (
              <TabIcon Icon={Clock} focused={focused} label="Clock" />
            ),
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
              <TabIcon Icon={User} focused={focused} label="Profiled" />
            ),
          }}
        />
      </Tabs>
      <View style={{
        padding: 10
      }}>
<Text>text here </Text>
      </View>
    </>
  )
}

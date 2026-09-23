import { Tabs } from "expo-router"
import type { LucideIcon } from "lucide-react-native"
import {
  Briefcase,
  CalendarDays,
  Clock,
  Home,
  User,
} from "lucide-react-native"
import { Text, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

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
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        width: 64,
      }}
    >
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
  const { width: screenWidth } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  // Responsive width, with at least 16px on either side.
  const tabBarWidth = Math.min(screenWidth - 32, 400)
  const sideGap = (screenWidth - tabBarWidth) / 2

  // Keep the floating bar above the system gesture area.
  const bottomGap = Math.max(insets.bottom, 16)

  return (

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,

          // Room for both the custom icon and its label.
          tabBarIconStyle: {
            width: 64,
            height: 54,
            paddingBottom:6
          },

          tabBarStyle: {
            // Let the page extend behind the navbar.
            position: "absolute",

            width: tabBarWidth,
            left: sideGap,
            // right: sideGap,
            bottom: bottomGap,

            height: 76,
            paddingTop: 10,
            // paddingBottom: 10,

            backgroundColor: "#FFFFFF",
            borderColor: "#E2E8F0",
            borderWidth: 1,
            borderRadius: 60,
            margin: "auto",
            marginLeft:sideGap
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
              <TabIcon
                Icon={CalendarDays}
                focused={focused}
                label="Schedule"
              />
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

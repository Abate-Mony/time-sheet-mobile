import { Tabs } from "expo-router"
import type { LucideIcon } from "lucide-react-native"
import {
  Briefcase,
  CalendarDays,
  Clock,
  Home,
  User,
} from "lucide-react-native"
import { Platform, Text, View, useWindowDimensions } from "react-native"
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
      style={
        [


          {
            // alignItems: "center",
            justifyContent: "center",
            gap: 3,
            width: "auto",
            marginBottom: ACTIVE ? 10 : 0,
            // backgroundColor: "#fff",
            borderRadius: 999,
            padding: 10,
            marginTop: focused ? -20 : 0,
            backgroundColor: "#FFFFFF",




          }
        ]
      }
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 9999,
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
        <Icon size={17} color={focused ? "#FFFFFF" : INACTIVE} />
      </View>

      <Text
        style={{
          fontSize: 8,
          fontWeight: "600",
          color: focused ? ACTIVE : INACTIVE,
          textTransform: "lowercase",
          textAlign: "center"
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
  const BOTTOM_PADDING = 100
  return (

    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        // Room for both the custom icon and its label.
        tabBarIconStyle: {
          width: 64,
          height: 54,
          paddingBottom: 6,
          borderRadius: 999,
        },

        tabBarStyle: {
          // Let the page extend behind the navbar.
          position: "absolute",

          // width: tabBarWidth,
          // left: sideGap,
          // right: sideGap,
          // bottom: bottomGap,

          height: 76,
          paddingTop: 8,
          // paddingBottom: 10,

          backgroundColor: "#FFFFFF",
          borderColor: "#E2E8F0",
          borderWidth: 1,
          // borderRadius: 60,
          margin: "auto",
          marginBottom: 0,
          paddingBottom: Platform.OS == "android" ? BOTTOM_PADDING-20 : BOTTOM_PADDING
          // marginLeft: sideGap
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
        // /jobs/[id] lives inside this tab's own nested stack, but gets
        // opened from everywhere (notification taps, Home/Clock/Schedule/
        // Earnings job cards) — pushing it from outside this tab leaves it
        // sitting on top of this stack indefinitely, since switching tabs
        // doesn't reset a tab's own history. Without this, tapping the
        // Jobs icon after any of those shows the stale job-details screen
        // instead of the all-jobs list the icon promises.
        // Inlines the POP_TO_TOP action's plain object shape instead of
        // importing StackActions from @react-navigation/native — Metro
        // hard-errors on any "@react-navigation/*" import under expo-router
        // on this Expo SDK (see useTabBarClearance.ts's note on the same
        // restriction). `navigation` here is a prop expo-router hands us,
        // not something we imported, so dispatching a plain action object
        // on it is fine.
        //
        // Targets the Jobs stack's OWN key (not the parent tab navigator)
        // and only pops that one stack — an earlier version rebuilt a full
        // RESET of the whole tab navigator's route list from a snapshot,
        // which raced under rapid repeated taps (a stale read of a
        // *sibling* tab's nested state could make the reconstructed payload
        // not match React Navigation's actual live state, producing an
        // "onUnhandledAction" dev warning). POP_TO_TOP targeted at a single
        // stack's key doesn't have that problem — popping an already-top
        // stack is just a no-op, not a race.
        listeners={({ navigation }) => ({
          tabPress: () => {
            const state = navigation.getState()
            const jobsRoute = state.routes.find((r: any) => r.name === "jobs")
            if (jobsRoute?.state && jobsRoute.state.index > 0 && jobsRoute.state.key) {
              navigation.dispatch({
                type: "POP_TO_TOP",
                target: jobsRoute.state.key,
              })
            }
          },
        })}
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

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
import { RestrictionBanner } from "@/components/RestrictionBanner"
import { useMyRestriction } from "@/hooks/useMyRestriction"
import { isRestricted } from "@/utils/restriction"

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
            marginBottom: 10,
            // backgroundColor: "#fff",
            borderRadius: 999,
            padding: 10,
            marginTop: focused ? -25 : 0,
            backgroundColor: "#FFFFFF",




          }
        ]
      }
    >
      <View
        style={{
          width: focused ? 36 : 30,
          height: focused ? 36 : 30,
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
        <Icon size={Platform.OS === "ios" ?  18 : 20} color={focused ? "#FFFFFF" : INACTIVE} />
      </View>

      <Text
        style={{
          fontSize: Platform.OS === "ios" ?  8 : 10,
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

// Tapping a tab's icon always lands on that tab's main screen. The Jobs and
// Profile tabs have their own stacks whose inner screens get opened from
// other tabs too (a job from Home/Clock/Schedule, Earnings from Home), and
// switching tabs doesn't reset a tab's own history — so without this, the
// icon shows whatever inner screen was last left open. Those cross-tab links
// pass `withAnchor` (see utils/openJob.ts) so the main screen is always
// underneath to pop back to.
//
// Inlines the POP_TO_TOP action's plain object shape instead of importing
// StackActions from @react-navigation/native — Metro hard-errors on any
// "@react-navigation/*" import under expo-router on this Expo SDK (see
// useTabBarClearance.ts's note on the same restriction). It targets the
// tab's OWN stack key, not the tab navigator: an earlier version RESET the
// whole tab navigator from a snapshot and raced under rapid taps; popping a
// single stack that's already at the top is just a no-op.
function popToTopOnTabPress(tabName: string) {
  return ({ navigation }: { navigation: any }) => ({
    tabPress: () => {
      const tab = navigation.getState().routes.find((r: any) => r.name === tabName)
      if (tab?.state && tab.state.index > 0 && tab.state.key) {
        navigation.dispatch({ type: "POP_TO_TOP", target: tab.state.key })
      }
    },
  })
}

export default function TabLayout() {
  const { width: screenWidth } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { data: restriction } = useMyRestriction()

  // Responsive width, with at least 16px on either side.
  const tabBarWidth = Math.min(screenWidth - 32, 400)
  const sideGap = (screenWidth - tabBarWidth) / 2

  // Keep the floating bar above the system gesture area.
  const bottomGap = Math.max(insets.bottom, 16)
  const BOTTOM_PADDING = 100
  return (
    <View style={{ flex: 1 }}>
      {/* Only read_only/limited ever render here — a "none" restriction
          shows the full-screen SuspendedOverlay (app/_layout.tsx) instead,
          which sits above this entire tab tree. */}
      {restriction && isRestricted(restriction) && <RestrictionBanner restriction={restriction} />}

    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        // Room for both the custom icon and its label.
        tabBarIconStyle: {
          width: 64,
          height: 54,
          paddingBottom: 6
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
          paddingBottom: Platform.OS == "android" ? BOTTOM_PADDING - 20 : BOTTOM_PADDING
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
        listeners={popToTopOnTabPress("jobs")}
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
        listeners={popToTopOnTabPress("profile")}
      />
    </Tabs>
    </View>
  )
}

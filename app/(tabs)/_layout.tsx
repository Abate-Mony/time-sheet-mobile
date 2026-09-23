import { Tabs } from "expo-router"
import type { LucideIcon } from "lucide-react-native"
import {
  Briefcase,
  CalendarDays,
  Clock,
  Home,
  User,
} from "lucide-react-native"
import { Platform, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

// Reddit's own palette: near-black for the active icon, mid-gray for
// inactive — no brand-color accent on the icons themselves, the fill
// switch is the only signal.
const ACTIVE = "#1A1A1B"
const INACTIVE = "#9B9BA1"
const BORDER = "#EDEFF1"

// A plain tab icon, Reddit-style: no label, and "active" means filled
// instead of outlined rather than a color or background change — most
// lucide icons accept `fill` directly, so this needs no icon swapping.
function TabIcon({ Icon, focused }: { Icon: LucideIcon; focused: boolean }) {
  return (
    <Icon
      size={26}
      color={focused ? ACTIVE : INACTIVE}
      fill={focused ? ACTIVE : "transparent"}
      strokeWidth={focused ? 1.5 : 2}
    />
  )
}

// The middle tab (Clock — the single most-used action for a worker) gets
// the same "own slot" treatment Reddit gives its create-post button: a
// permanent circular ring around the icon, present whether active or not.
function ClockTabIcon({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1.5,
        borderColor: focused ? ACTIVE : INACTIVE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Clock
        size={17}
        color={focused ? ACTIVE : INACTIVE}
        fill={focused ? ACTIVE : "transparent"}
        strokeWidth={focused ? 1.5 : 2}
      />
    </View>
  )
}

export default function TabLayout() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        tabBarStyle: {
          // Flush to the bottom edge, full width — not a floating pill.
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,

          height: 52 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,

          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: BORDER,
          borderRadius: 0,
          elevation: 0,

          // A hairline shadow instead of a hard border reads closer to
          // Reddit's actual bar than a heavier drop shadow would.
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: -1 },
            },
            android: { elevation: 8 },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="jobs"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={Briefcase} focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="clock"
        options={{
          tabBarIcon: ({ focused }) => <ClockTabIcon focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={CalendarDays} focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={User} focused={focused} />,
        }}
      />
    </Tabs>
  )
}

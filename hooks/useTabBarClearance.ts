import { useSafeAreaInsets } from "react-native-safe-area-context";

// Single source of truth for "how much space does the floating tab bar take
// up at the bottom of the screen" — every tab screen's scrollable content
// needs this as bottom padding, or its last items render underneath the
// bar instead of above it (the bar is position: absolute, so it doesn't
// push scroll content up on its own the way a normal docked element would).
//
// This mirrors app/(tabs)/_layout.tsx's own tabBarStyle geometry (height 76,
// bottom: max(insets.bottom, 16)) rather than reading it live via
// react-navigation's useBottomTabBarHeight(): as of Expo SDK 56+,
// expo-router no longer allows importing anything from an
// "@react-navigation/*" package (including useBottomTabBarHeight from
// @react-navigation/bottom-tabs) — Metro throws a hard build error the
// instant that module is resolved, even though expo-router still vendors
// react-navigation's code internally to implement its own <Tabs>. There's no
// public expo-router export of this value, so the two numbers below need to
// stay in sync with _layout.tsx by hand if that bar's height/spacing ever
// changes — duplicated once here rather than solved with an unsupported
// deep/private import into expo-router's own node_modules internals.
const TAB_BAR_HEIGHT = 76;
const MIN_BOTTOM_GAP = 16;

export function useTabBarClearance(extra = 16): number {
  const insets = useSafeAreaInsets();
  const bottomGap = Math.max(insets.bottom, MIN_BOTTOM_GAP);
  return bottomGap + TAB_BAR_HEIGHT + extra;
}

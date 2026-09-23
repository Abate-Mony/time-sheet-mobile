import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

// Single source of truth for "how much space does the floating tab bar take
// up at the bottom of the screen" — every tab screen's scrollable content
// needs this as bottom padding, or its last items render underneath the
// bar instead of above it (the bar is position: absolute, so it doesn't
// push scroll content up on its own the way a normal docked element would).
//
// useBottomTabBarHeight() reads the tab bar's real, currently-rendered
// height/position from the navigator itself, so this stays correct even as
// app/(tabs)/_layout.tsx's own bar height/spacing/safe-area math changes —
// nothing here needs to duplicate that calculation.
//
// Only call this from a screen that's actually inside the tab navigator
// (i.e. one of the files under app/(tabs)/) — it throws if called outside
// one.
export function useTabBarClearance(extra = 16): number {
  const tabBarHeight = useBottomTabBarHeight();
  return tabBarHeight + extra;
}

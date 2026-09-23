import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // "Window focus" only means something once app/_layout.tsx's AppState
      // listener tells React Query's focusManager the app came back to the
      // foreground — before that wiring existed this flag was a no-op on
      // React Native (there's no browser window to blur/focus), so leaving
      // it false silently did nothing. Now that the app reports real focus
      // changes, this can stay on its default (true) so a backgrounded-then-
      // resumed app actually refetches stale data instead of showing
      // whatever was cached from before it was backgrounded.
    },
  },
});
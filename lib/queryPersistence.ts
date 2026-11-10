import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { onlineManager } from "@tanstack/react-query";
import type { PersistQueryClientProviderProps } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";

// Offline cache: the last successful copy of selected queries is saved to
// AsyncStorage and restored on launch, so a worker on a site with no signal
// still sees their shifts instead of a spinner. Writes (clock in/out) are
// NOT handled here — those go through the existing offline clock queue
// (utils/offlineClockQueue.ts).
//
// AsyncStorage is not encrypted (unlike SecureStore, which holds the auth
// tokens and is the wrong tool for a whole cache). Acceptable for shift
// data on a passcode-protected phone; never add tokens or secrets here.

// How long a saved cache is trusted. queryClient's gcTime must be at least
// this long, or React Query garbage-collects data before it can be saved.
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

// Allowlist (first queryKey segment) — a new query is only saved offline if
// it's added here on purpose. Left out deliberately: open shifts & claims
// (go stale fast, can't act on them offline), notifications (stale counts
// mislead), restrictions/plan gates (a stale "restricted" must not stick),
// documents & timesheet exports (large, fetched on demand).
const PERSISTED_QUERY_KEYS = new Set([
  "active-job",
  "job",
  "jobs",
  "worker-schedule-upcoming",
  "worker-schedule-month",
  "worker-recurring-groups",
  "worker-route",
  "worker-dashboard-stats",
  "worker-stats",
  "earnings",
  "availability",
  "time-off",
  "overtime",
  "my-contacts",
  "my-team",
  "my-locations",
]);

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "onclockly-query-cache",
  // Coalesce bursts of cache updates into one write.
  throttleTime: 1000,
});

export const persistOptions: PersistQueryClientProviderProps["persistOptions"] = {
  persister: queryPersister,
  maxAge: PERSIST_MAX_AGE,
  // A new app version may change response shapes — never restore a cache
  // written by a different version.
  buster: Constants.expoConfig?.version ?? "dev",
  dehydrateOptions: {
    shouldDehydrateQuery: query =>
      query.state.status === "success" && PERSISTED_QUERY_KEYS.has(String(query.queryKey[0])),
  },
};

// Called on logout, alongside queryClient.clear() — otherwise the next
// person to sign in on this phone would get the previous worker's shifts
// restored from disk.
export async function clearPersistedQueries(): Promise<void> {
  try {
    await queryPersister.removeClient();
  } catch (err) {
    console.warn("Failed to clear the offline cache:", err);
  }
}

// React Query has no idea about connectivity on React Native by default.
// With this, offline queries pause (showing saved data) instead of failing
// and retrying, and resume automatically once the phone is back online.
onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => {
    setOnline(state.isConnected !== false);
  })
);

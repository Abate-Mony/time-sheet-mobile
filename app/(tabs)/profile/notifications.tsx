import { queryClient } from '@/lib/queryClient'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type UpdateNotificationPreferencesPayload,
} from '@/utils/api-request-functions'
import type {
  EventNotificationPreference,
  NotificationChannel,
  NotificationEvent,
  NotificationPreferences,
} from '@/utils/types'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Bell, ChevronLeft } from 'lucide-react-native'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const notificationPreferencesQuery = {
  queryKey: ['notification-preferences'],
  queryFn: getNotificationPreferences,
}

// Worker-facing events only — things that happen TO this worker. Events
// like job_accepted/worker_checked_in/etc. describe a worker's action being
// observed and are manager/admin-facing, not shown here.
const SECTIONS: {
  title: string
  rows: { event: NotificationEvent; label: string; description: string }[]
}[] = [
  {
    title: 'Jobs',
    rows: [
      { event: 'job_assigned', label: 'New job assigned', description: 'When a manager assigns you a shift' },
    ],
  },
  {
    title: 'Timesheets',
    rows: [
      { event: 'timesheet_approved', label: 'Timesheet approved', description: 'When your timesheet is approved' },
      { event: 'timesheet_rejected', label: 'Timesheet rejected', description: 'When your timesheet is rejected' },
    ],
  },
]

function ChannelSwitch({
  label,
  checked,
  disabled,
  onValueChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onValueChange: (value: boolean) => void
}) {
  return (
    <View style={styles.channelSwitch}>
      <Text style={styles.channelLabel}>{label}</Text>
      <Switch
        value={checked}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ true: '#1E3A5F' }}
      />
    </View>
  )
}

export default function NotificationsScreen() {
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useQuery(notificationPreferencesQuery)
  const prefs = data?.preferences

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateNotificationPreferencesPayload) => updateNotificationPreferences(payload),
    onMutate: async payload => {
      await queryClient.cancelQueries({ queryKey: notificationPreferencesQuery.queryKey })
      const previous = queryClient.getQueryData<{ preferences: NotificationPreferences }>(
        notificationPreferencesQuery.queryKey
      )

      queryClient.setQueryData(
        notificationPreferencesQuery.queryKey,
        (current: { preferences: NotificationPreferences } | undefined) => {
          if (!current) return current
          return {
            ...current,
            preferences: {
              ...current.preferences,
              ...payload,
              events: payload.events
                ? {
                    ...current.preferences.events,
                    ...Object.fromEntries(
                      Object.entries(payload.events).map(([event, channels]) => [
                        event,
                        { ...current.preferences.events[event as NotificationEvent], ...channels },
                      ])
                    ),
                  }
                : current.preferences.events,
            },
          }
        }
      )

      return { previous }
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationPreferencesQuery.queryKey, context.previous)
      }
    },
  })

  const setMasterPreference = (key: 'emailEnabled' | 'pushEnabled' | 'inAppEnabled', value: boolean) =>
    updateMutation.mutate({ [key]: value })

  const setEventPreference = (event: NotificationEvent, channel: NotificationChannel, value: boolean) =>
    updateMutation.mutate({ events: { [event]: { [channel]: value } } })

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={16} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Bell size={15} color="#64748B" />
          </View>
          <View>
            <Text style={styles.title}>Notification Preferences</Text>
            <Text style={styles.subtitle}>Choose what you want to hear about and how</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#1E3A5F" />
        ) : isError || !prefs ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Unable to load notification preferences.</Text>
            <Pressable style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Communication channels</Text>

              <View style={styles.masterRow}>
                <View style={styles.flex1}>
                  <Text style={styles.rowLabel}>Email notifications</Text>
                  <Text style={styles.rowSub}>Receive important updates by email</Text>
                </View>
                <Switch
                  value={prefs.emailEnabled}
                  onValueChange={value => setMasterPreference('emailEnabled', value)}
                  trackColor={{ true: '#1E3A5F' }}
                />
              </View>

              <View style={styles.masterRow}>
                <View style={styles.flex1}>
                  <Text style={styles.rowLabel}>Push notifications</Text>
                  <Text style={styles.rowSub}>Receive notifications on your device</Text>
                </View>
                <Switch
                  value={prefs.pushEnabled}
                  onValueChange={value => setMasterPreference('pushEnabled', value)}
                  trackColor={{ true: '#1E3A5F' }}
                />
              </View>

              <View style={[styles.masterRow, styles.masterRowLast]}>
                <View style={styles.flex1}>
                  <Text style={styles.rowLabel}>In-app notifications</Text>
                  <Text style={styles.rowSub}>Show notifications inside the app</Text>
                </View>
                <Switch
                  value={prefs.inAppEnabled}
                  onValueChange={value => setMasterPreference('inAppEnabled', value)}
                  trackColor={{ true: '#1E3A5F' }}
                />
              </View>
            </View>

            {SECTIONS.map(section => (
              <View key={section.title} style={styles.card}>
                <Text style={styles.cardHeading}>{section.title}</Text>

                {section.rows.map((row, index) => {
                  const eventPrefs: EventNotificationPreference | undefined = prefs.events[row.event]

                  return (
                    <View
                      key={row.event}
                      style={[styles.eventRow, index === section.rows.length - 1 && styles.eventRowLast]}
                    >
                      <Text style={styles.rowLabel}>{row.label}</Text>
                      <Text style={styles.rowSub}>{row.description}</Text>

                      <View style={styles.channelRow}>
                        <ChannelSwitch
                          label="Email"
                          checked={!!eventPrefs?.email}
                          disabled={!prefs.emailEnabled}
                          onValueChange={value => setEventPreference(row.event, 'email', value)}
                        />
                        <ChannelSwitch
                          label="Push"
                          checked={!!eventPrefs?.push}
                          disabled={!prefs.pushEnabled}
                          onValueChange={value => setEventPreference(row.event, 'push', value)}
                        />
                        <ChannelSwitch
                          label="In-app"
                          checked={!!eventPrefs?.inApp}
                          disabled={!prefs.inAppEnabled}
                          onValueChange={value => setEventPreference(row.event, 'inApp', value)}
                        />
                      </View>
                    </View>
                  )
                })}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },

  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#94A3B8',
  },

  empty: {
    marginTop: 40,
    alignItems: 'center',
    gap: 12,
  },

  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },

  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E3A5F',
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
    paddingVertical: 4,
  },

  cardHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },

  masterRowLast: {
    borderBottomWidth: 0,
  },

  flex1: {
    flex: 1,
  },

  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },

  rowSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#94A3B8',
  },

  eventRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 10,
  },

  eventRowLast: {
    borderBottomWidth: 0,
  },

  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  channelSwitch: {
    alignItems: 'center',
    gap: 4,
  },

  channelLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
})

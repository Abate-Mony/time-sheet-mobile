import { useOpenShifts } from '@/hooks/useOpenShifts'
import { claimOpenShift, takeShiftGiveaway } from '@/utils/api-request-functions'
import { formatDate } from '@/utils/date'
import type { Job } from '@/utils/types'
import { useRouter } from 'expo-router'
import { AlertCircle, Calendar, CalendarClock, ChevronRight, Clock as ClockIcon, MapPin } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function OpenShiftsScreen() {
  const router = useRouter()
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const { data: shifts, isLoading, isError, refetch, isRefetching } = useOpenShifts()

  const claim = async (shift: Job) => {
    setClaimingId(shift._id)
    const ok = shift.giveaway
      ? await takeShiftGiveaway(shift.giveaway.assignmentId)
      : await claimOpenShift(shift._id)
    setClaimingId(null)
    if (ok) refetch()
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Open Shifts</Text>
            <Text style={styles.subtitle}>Unassigned shifts you can pick up</Text>
          </View>
          <Pressable style={styles.claimsLink} onPress={() => router.push('/(tabs)/jobs/my-claims')}>
            <Text style={styles.claimsLinkText}>My claims</Text>
            <ChevronRight size={14} color="#1E3A5F" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#1E3A5F" />}
      >
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#1E3A5F" />
        ) : isError ? (
          <View style={styles.empty}>
            <AlertCircle size={20} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Couldn&apos;t load open shifts</Text>
            <Text style={styles.emptyText}>Pull to refresh or try again shortly.</Text>
          </View>
        ) : !shifts || shifts.length === 0 ? (
          <View style={styles.empty}>
            <CalendarClock size={20} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No open shifts right now</Text>
            <Text style={styles.emptyText}>
              When a manager opens a shift up for claiming, it&apos;ll show up here.
            </Text>
          </View>
        ) : (
          shifts.map(shift => (
            <Pressable key={shift._id} style={styles.card} onPress={() => router.push({
              pathname: '/(tabs)/jobs/open-shifts-details',
              params: { id: shift._id }
            })}>
              <View style={styles.cardHeader}>
                {!!shift.client?.name && <Text style={styles.clientName}>{shift.client.name.toUpperCase()}</Text>}
                <Text style={styles.jobTitle} numberOfLines={1}>
                  {shift.title}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Calendar size={13} color="#64748B" />
                <Text style={styles.metaText}>{formatDate(shift.date)}</Text>
              </View>
              <View style={styles.metaRow}>
                <ClockIcon size={13} color="#64748B" />
                <Text style={styles.metaText}>
                  {shift.startTime}–{shift.endTime}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <MapPin size={13} color="#64748B" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {shift.location}
                </Text>
              </View>

              {!!shift.payRate && <Text style={styles.payRate}>£{shift.payRate}/hr</Text>}

              {!!shift.giveaway && (
                <View style={styles.giveawayTag}>
                  <Text style={styles.giveawayTagText}>Offered by {shift.giveaway.offeredBy}</Text>
                </View>
              )}

              <Pressable
                style={[styles.claimButton, claimingId === shift._id && styles.disabled]}
                disabled={claimingId === shift._id}
                onPress={() => claim(shift)}
              >
                {claimingId === shift._id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.claimButtonText}>{shift.giveaway ? 'Take Shift' : 'Claim Shift'}</Text>
                )}
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },

  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  claimsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  claimsLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A5F',
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },

  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },

  content: {
    padding: 16,
    paddingTop: 12,
    gap: 12,
    flexGrow: 1,
  },

  empty: {
    marginTop: 40,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },

  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 6,
  },

  cardHeader: {
    marginBottom: 4,
  },

  clientName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  metaText: {
    fontSize: 12,
    color: '#64748B',
    flexShrink: 1,
  },

  payRate: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A5F',
  },

  giveawayTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F3FF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },

  giveawayTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D28D9',
  },

  claimButton: {
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  claimButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  disabled: {
    opacity: 0.6,
  },
})

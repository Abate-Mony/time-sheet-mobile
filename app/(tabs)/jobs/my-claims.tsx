import { getMyClaims, withdrawOpenShiftClaim } from '@/utils/api-request-functions'
import { formatDate } from '@/utils/date'
import type { ClaimStatus, OpenShiftClaim } from '@/utils/types'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { AlertCircle, Calendar, ChevronRight, Clock as ClockIcon, Hand, MapPin } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const STATUS_STYLE: Record<ClaimStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Awaiting approval', bg: '#FEF3C7', fg: '#92400E' },
  approved: { label: 'Approved', bg: '#DCFCE7', fg: '#166534' },
  declined: { label: 'Declined', bg: '#FEE2E2', fg: '#991B1B' },
  withdrawn: { label: 'Withdrawn', bg: '#F1F5F9', fg: '#475569' },
  cancelled: { label: 'Cancelled', bg: '#F1F5F9', fg: '#475569' },
}

export default function MyClaimsScreen() {
  const router = useRouter()
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  const { data: claims, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['my-claims'],
    queryFn: getMyClaims,
  })

  const pending = claims?.filter(c => c.claimStatus === 'pending') ?? []
  const past = claims?.filter(c => c.claimStatus !== 'pending') ?? []

  const confirmWithdraw = (claim: OpenShiftClaim) => {
    Alert.alert('Withdraw claim?', `You won't be able to claim "${claim.job.title}" again.`, [
      { text: 'Keep claim', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          setWithdrawingId(claim._id)
          await withdrawOpenShiftClaim(claim._id)
          setWithdrawingId(null)
        },
      },
    ])
  }

  const renderClaim = (claim: OpenShiftClaim) => {
    const { job } = claim
    const badge = STATUS_STYLE[claim.claimStatus]
    // Declined/withdrawn/cancelled claims have nothing left to do on the job
    // screen beyond the "no longer assigned" notice.
    const canOpen = claim.claimStatus === 'approved' || claim.claimStatus === 'pending'

    return (
      <Pressable
        key={claim._id}
        style={styles.card}
        disabled={!canOpen}
        onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: job._id } })}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            {!!job.client?.name && <Text style={styles.clientName}>{job.client.name.toUpperCase()}</Text>}
            <Text style={styles.jobTitle} numberOfLines={1}>
              {job.title}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Calendar size={13} color="#64748B" />
          <Text style={styles.metaText}>{formatDate(job.date)}</Text>
        </View>
        <View style={styles.metaRow}>
          <ClockIcon size={13} color="#64748B" />
          <Text style={styles.metaText}>
            {job.startTime}–{job.endTime}
          </Text>
        </View>
        {!!job.location && (
          <View style={styles.metaRow}>
            <MapPin size={13} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>
              {job.location}
            </Text>
          </View>
        )}

        <Text style={styles.claimedAt}>
          {claim.isGiveaway ? 'Taken from a colleague' : 'Claimed'} {formatDate(claim.claimedAt, 'D MMM, HH:mm')}
        </Text>

        {claim.claimStatus === 'pending' && (
          <Pressable
            style={[styles.withdrawButton, withdrawingId === claim._id && styles.disabled]}
            disabled={withdrawingId === claim._id}
            onPress={() => confirmWithdraw(claim)}
          >
            {withdrawingId === claim._id ? (
              <ActivityIndicator size="small" color="#991B1B" />
            ) : (
              <Text style={styles.withdrawButtonText}>Withdraw claim</Text>
            )}
          </Pressable>
        )}

        {canOpen && (
          <View style={styles.openRow}>
            <Text style={styles.openText}>View shift</Text>
            <ChevronRight size={14} color="#1E3A5F" />
          </View>
        )}
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>My Claims</Text>
        <Text style={styles.subtitle}>Open shifts you&apos;ve claimed and where they stand</Text>
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
            <Text style={styles.emptyTitle}>Couldn&apos;t load your claims</Text>
            <Text style={styles.emptyText}>Pull to refresh or try again shortly.</Text>
          </View>
        ) : !claims || claims.length === 0 ? (
          <View style={styles.empty}>
            <Hand size={20} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No claims yet</Text>
            <Text style={styles.emptyText}>Shifts you claim from Open Shifts will show up here.</Text>
          </View>
        ) : (
          <>
            {pending.length > 0 && <Text style={styles.sectionTitle}>Awaiting approval</Text>}
            {pending.map(renderClaim)}
            {past.length > 0 && <Text style={styles.sectionTitle}>Past claims</Text>}
            {past.map(renderClaim)}
          </>
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
    paddingBottom: 120,
    gap: 12,
    flexGrow: 1,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
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

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '700',
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

  claimedAt: {
    marginTop: 2,
    fontSize: 11,
    color: '#94A3B8',
  },

  withdrawButton: {
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  withdrawButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },

  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },

  openText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A5F',
  },

  disabled: {
    opacity: 0.6,
  },
})

import { useTabBarClearance } from '@/hooks/useTabBarClearance'
import { getMyOvertime } from '@/utils/api-request-functions'
import { formatDuration } from '@/utils/date'
import type { OvertimeItem, OvertimeStatus } from '@/utils/types'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { CheckCircle2, ChevronLeft, Clock, Hourglass, XCircle } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const FILTERS: { id: OvertimeStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

const STATUS_STYLES: Record<OvertimeStatus, { bg: string; text: string; label: string; Icon: typeof Clock }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', label: 'Pending', Icon: Hourglass },
  approved: { bg: '#D1FAE5', text: '#047857', label: 'Approved', Icon: CheckCircle2 },
  rejected: { bg: '#FEE2E2', text: '#B91C1C', label: 'Rejected', Icon: XCircle },
}

function OvertimeCard({ item }: { item: OvertimeItem }) {
  const statusStyle = STATUS_STYLES[item.overtimeStatus]
  const { Icon } = statusStyle

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: statusStyle.bg }]}>
          <Icon size={13} color={statusStyle.text} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.job.title}</Text>
          <Text style={styles.jobMeta}>{dayjs(item.job.date).format('ddd, D MMM YYYY')} · {item.job.location}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
        </View>
      </View>

      <View style={styles.minutesRow}>
        <View style={styles.minutesCol}>
          <Text style={styles.minutesLabel}>Worked</Text>
          <Text style={styles.minutesValue}>{formatDuration(item.actualMinutes)}</Text>
        </View>
        <View style={styles.minutesCol}>
          <Text style={styles.minutesLabel}>Overtime</Text>
          <Text style={styles.minutesValue}>+{formatDuration(item.overtimeMinutes)}</Text>
        </View>
        <View style={styles.minutesCol}>
          <Text style={styles.minutesLabel}>{item.overtimeStatus === 'pending' ? 'Pending pay' : 'Paid'}</Text>
          <Text style={[styles.minutesValue, item.overtimeStatus === 'approved' && styles.minutesValuePositive]}>
            {formatDuration(item.overtimeStatus === 'pending' ? item.actualMinutes : item.approvedMinutes)}
          </Text>
        </View>
      </View>

      {!!item.managerNotes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>Manager: {item.managerNotes}</Text>
        </View>
      )}

      {!!item.overtimeReviewedAt && (
        <Text style={styles.reviewedAt}>Reviewed {dayjs(item.overtimeReviewedAt).format('D MMM YYYY, HH:mm')}</Text>
      )}
    </View>
  )
}

export default function OvertimeScreen() {
  const router = useRouter()
  const tabBarClearance = useTabBarClearance()
  const [filter, setFilter] = useState<OvertimeStatus | 'all'>('all')

  const { data: items, isLoading, isError, refetch } = useQuery({
    queryKey: ['overtime', 'me'],
    queryFn: () => getMyOvertime(),
  })

  const filtered = (items ?? []).filter(i => filter === 'all' || i.overtimeStatus === filter)

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={16} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Clock size={15} color="#64748B" />
          </View>
          <View>
            <Text style={styles.title}>Overtime</Text>
            <Text style={styles.subtitle}>See what's pending, approved, or declined</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === f.id && styles.filterChipTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color="#1E3A5F" style={{ marginTop: 12 }} />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Couldn't load your overtime.</Text>
            <Pressable onPress={() => refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : !filtered.length ? (
          <View style={styles.empty}>
            <Clock size={28} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No overtime on record yet' : `No ${filter} overtime`}
            </Text>
          </View>
        ) : (
          filtered.map(item => <OvertimeCard key={item.assignmentId} item={item} />)
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  flex1: { flex: 1 },

  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontWeight: '600', color: '#64748B' },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  subtitle: { marginTop: 2, fontSize: 12, color: '#94A3B8' },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  filterChipActive: { backgroundColor: '#1E3A5F', borderColor: '#1E3A5F' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterChipTextActive: { color: '#FFFFFF' },

  empty: { marginTop: 12, alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyText: { fontSize: 13, color: '#94A3B8' },
  retryText: { fontSize: 13, fontWeight: '700', color: '#1E3A5F' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  jobMeta: { marginTop: 2, fontSize: 11, color: '#94A3B8' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  minutesRow: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  minutesCol: { flex: 1, alignItems: 'center' },
  minutesLabel: { fontSize: 10, color: '#94A3B8' },
  minutesValue: { marginTop: 2, fontSize: 13, fontWeight: '700', color: '#0F172A' },
  minutesValuePositive: { color: '#047857' },

  notesBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10 },
  notesText: { fontSize: 12, color: '#475569', lineHeight: 17 },

  reviewedAt: { fontSize: 10, color: '#CBD5E1' },
})

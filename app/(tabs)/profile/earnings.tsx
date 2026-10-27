import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import customFetch from '@/utils/customFetch';
import { formatDate, formatDuration } from '@/utils/date';
import { openJob } from "@/utils/openJob";
import type { EarningsPeriod, EarningsResponse, EarningsShift } from '@/utils/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { AlertCircle, ChevronLeft, ChevronRight, Clock, FileText, ShieldCheck, Wallet, WalletCards } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const money = (n: number) => `£${n.toFixed(2)}`

function EarningsHero({ data }: { data: EarningsResponse }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View>
          <Text style={styles.heroLabel}>EARNED THIS PERIOD</Text>
          <Text style={styles.heroAmount}>{money(data.earned.amount)}</Text>
          <View style={styles.heroBadgeRow}>
            <ShieldCheck size={12} color="#6EE7B7" />
            <Text style={styles.heroBadgeText}>{data.earned.shifts} completed shift{data.earned.shifts === 1 ? '' : 's'}</Text>
          </View>
        </View>
        <View style={styles.heroIconBox}>
          <WalletCards size={18} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.heroStats}>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatLabel}>HOURS WORKED</Text>
          <Text style={styles.heroStatValue}>{formatDuration(data.earned.minutes)}</Text>
        </View>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatLabel}>UPCOMING</Text>
          <Text style={styles.heroStatValue}>{money(data.upcoming.amount)}</Text>
        </View>
      </View>
    </View>
  )
}

function PayBreakdown({ earned }: { earned: EarningsResponse['earned'] }) {
  if (earned.amount <= 0) return null
  const rows = [
    { label: 'Regular pay', value: earned.regularAmount, color: '#3B82F6' },
    ...(earned.overtimeAmount > 0 ? [{ label: 'Approved overtime', value: earned.overtimeAmount, color: '#8B5CF6' }] : []),
  ]
  return (
    <View style={styles.breakdownCard}>
      <Text style={styles.breakdownTitle}>Pay breakdown</Text>
      <View style={{ gap: 14 }}>
        {rows.map(row => (
          <View key={row.label}>
            <View style={styles.breakdownRowTop}>
              <Text style={styles.breakdownLabel}>{row.label}</Text>
              <Text style={styles.breakdownValue}>{money(row.value)}</Text>
            </View>
            <View style={styles.breakdownTrack}>
              <View style={[styles.breakdownFill, { backgroundColor: row.color, width: `${Math.min(100, (row.value / earned.amount) * 100)}%` }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function periodLabel(period: EarningsResponse['period']) {
  const start = dayjs(period.start)
  const end = dayjs(period.end)
  if (period.type === 'month') {
    return period.offset === 0 ? 'This month' : start.format('MMMM YYYY')
  }
  if (period.offset === 0) return 'This week'
  if (period.offset === -1) return 'Last week'
  return `${start.format('D MMM')} – ${end.format('D MMM')}`
}

export default function EarningsScreen() {
  const router = useRouter()
  const tabBarClearance = useTabBarClearance()
  const [period, setPeriod] = useState<EarningsPeriod>('week')
  const [offset, setOffset] = useState(0)

  const { data, isLoading, isError, refetch, isRefetching, isPlaceholderData } = useQuery({
    queryKey: ['earnings', period, offset],
    queryFn: async () => {
      const { data } = await customFetch.get<EarningsResponse>('/workers/me/earnings', { params: { period, offset } })
      return data
    },
    // Keep the old numbers on screen while stepping between periods.
    placeholderData: keepPreviousData,
  })

  const switchPeriod = (next: EarningsPeriod) => {
    setPeriod(next)
    setOffset(0)
  }

  const renderShift = (s: EarningsShift) => (
    <Pressable
      key={s.assignmentId}
      style={styles.shiftRow}
      onPress={() => openJob(s.job._id)}
    >
      <View style={styles.shiftDate}>
        <Text style={styles.shiftDay}>{formatDate(s.job.date, 'ddd')}</Text>
        <Text style={styles.shiftDayNum}>{formatDate(s.job.date, 'D')}</Text>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.shiftTitle} numberOfLines={1}>
          {s.job.title}
        </Text>
        <Text style={styles.shiftMeta}>
          {s.job.startTime}–{s.job.endTime} · {formatDuration(s.minutes)} · £{s.payRate}/hr
        </Text>
        {s.overtimePendingMinutes > 0 && (
          <Text style={styles.overtimeNote}>+{formatDuration(s.overtimePendingMinutes)} overtime awaiting approval</Text>
        )}
      </View>
      <Text style={[styles.shiftAmount, s.kind === 'upcoming' && styles.shiftAmountUpcoming]}>{money(s.amount)}</Text>
    </Pressable>
  )

  const earnedShifts = data?.shifts.filter(s => s.kind === 'earned') ?? []
  const upcomingShifts = data?.shifts.filter(s => s.kind === 'upcoming') ?? []

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={18} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Earnings</Text>

        <View style={styles.segment}>
          {(['week', 'month'] as const).map(p => (
            <Pressable
              key={p}
              style={[styles.segmentItem, period === p && styles.segmentItemActive]}
              onPress={() => switchPeriod(p)}
            >
              <Text style={[styles.segmentText, period === p && styles.segmentTextActive]}>
                {p === 'week' ? 'Week' : 'Month'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}
        refreshControl={<RefreshControl refreshing={isRefetching && !isPlaceholderData} onRefresh={() => refetch()} tintColor="#1E3A5F" />}
      >
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#1E3A5F" />
        ) : isError || !data ? (
          <View style={styles.empty}>
            <AlertCircle size={20} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Couldn&apos;t load earnings</Text>
            <Text style={styles.emptyText}>Pull to refresh or try again shortly.</Text>
          </View>
        ) : (
          <>
            <View style={styles.periodNav}>
              <Pressable style={styles.navButton} onPress={() => setOffset(o => o - 1)} hitSlop={6}>
                <ChevronLeft size={16} color="#1E3A5F" />
              </Pressable>
              <Text style={styles.periodLabel}>{periodLabel(data.period)}</Text>
              <Pressable
                style={[styles.navButton, offset >= 0 && styles.navButtonDisabled]}
                disabled={offset >= 0}
                onPress={() => setOffset(o => o + 1)}
                hitSlop={6}
              >
                <ChevronRight size={16} color="#1E3A5F" />
              </Pressable>
            </View>
            <View style={isPlaceholderData && styles.dimmed}>
              <EarningsHero data={data} />
              <PayBreakdown earned={data.earned} />
              {data.pendingOvertimeAmount > 0 && (
                <Pressable style={styles.pendingBanner} onPress={() => router.push('/(tabs)/profile/overtime')}>
                  <Clock size={16} color="#B45309" style={{ marginTop: 1 }} />
                  <View style={styles.flex1}>
                    <Text style={styles.pendingTitle}>{money(data.pendingOvertimeAmount)} pending approval</Text>
                    <Text style={styles.pendingText}>Overtime awaiting your manager&apos;s review isn&apos;t included in the total above.</Text>
                  </View>
                  <ChevronRight size={16} color="#B45309" />
                </Pressable>
              )}
              <Pressable style={styles.timesheetButton} onPress={() => router.push('/(tabs)/profile/download-time-sheet')}>
                <FileText size={15} color="#FFFFFF" />
                <Text style={styles.timesheetButtonText}>View &amp; export timesheet</Text>
              </Pressable>
            </View>

            {data.shifts.length === 0 ? (
              <View style={styles.empty}>
                <Wallet size={20} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No shifts in this period</Text>
                <Text style={styles.emptyText}>Completed and upcoming shifts will show here with their pay.</Text>
              </View>
            ) : (
              <View style={isPlaceholderData && styles.dimmed}>
                {upcomingShifts.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Upcoming · estimated</Text>
                    <View style={styles.list}>{upcomingShifts.map(renderShift)}</View>
                  </>
                )}
                {earnedShifts.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Completed</Text>
                    <View style={styles.list}>{earnedShifts.map(renderShift)}</View>
                  </>
                )}
                <Text style={styles.footnote}>
                  Amounts are before tax and deductions. Upcoming pay is estimated from scheduled hours.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  flex1: { flex: 1 },

  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 6 },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2 },
  backText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A' },

  segment: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 10, padding: 3, marginTop: 4 },
  segmentItem: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#FFFFFF' },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  segmentTextActive: { color: '#0F172A' },

  content: { padding: 16, paddingTop: 12, gap: 12, flexGrow: 1 },

  periodNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: { opacity: 0.35 },
  periodLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  hero: { backgroundColor: '#1E3A5F', borderRadius: 20, padding: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.7 },
  heroAmount: { marginTop: 4, fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  heroBadgeText: { fontSize: 11, fontWeight: '600', color: '#6EE7B7' },
  heroIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  heroStat: { flex: 1 },
  heroStatLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 },
  heroStatValue: { marginTop: 3, fontSize: 16, fontWeight: '800', color: '#FFFFFF' },

  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 12,
  },
  breakdownTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 14 },
  breakdownRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  breakdownLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  breakdownValue: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  breakdownTrack: { height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  breakdownFill: { height: '100%', borderRadius: 3 },

  pendingBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  pendingTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  pendingText: { fontSize: 11, color: '#B45309', marginTop: 2, lineHeight: 15 },

  timesheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1E3A5F',
    marginTop: 12,
  },
  timesheetButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  dimmed: { opacity: 0.5 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 8,
  },
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  shiftDate: { width: 36, alignItems: 'center' },
  shiftDay: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  shiftDayNum: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  shiftTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  shiftMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  overtimeNote: { fontSize: 11, color: '#B45309', marginTop: 3, fontWeight: '600' },
  shiftAmount: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  shiftAmountUpcoming: { color: '#94A3B8' },

  footnote: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 14, paddingHorizontal: 12 },

  empty: { marginTop: 32, alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  emptyText: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
})

import { getToken } from '@/utils/auth'
import { BASE_URL } from '@/utils/customFetch'
import { formatDate, formatDuration } from '@/utils/date'
import { getTimesheetSummary } from '@/utils/api-request-functions'
import type { TimesheetPeriodType } from '@/utils/types'
import { useQuery } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import { Directory, File, Paths } from 'expo-file-system'
import { useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

const PERIOD_TYPES: { id: TimesheetPeriodType; label: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Bi-weekly' },
  { id: 'monthly', label: 'Monthly' },
]

export function startOfWeek(d: Dayjs) {
  const day = d.day()
  const diffToMonday = day === 0 ? -6 : 1 - day
  return d.add(diffToMonday, 'day').startOf('day')
}

// A fixed Monday anchors every biweekly block to the same 14-day grid, so
// paging forward/back always lands on stable, non-overlapping periods
// instead of drifting depending on which date you started from.
const BIWEEKLY_EPOCH = startOfWeek(dayjs('2024-01-01'))

function getPeriodRange(type: TimesheetPeriodType, anchor: Dayjs): { start: Dayjs; end: Dayjs } {
  if (type === 'weekly') {
    const start = startOfWeek(anchor)
    return { start, end: start.add(6, 'day') }
  }

  if (type === 'biweekly') {
    const weeksSinceEpoch = startOfWeek(anchor).diff(BIWEEKLY_EPOCH, 'week')
    const blockIndex = Math.floor(weeksSinceEpoch / 2)
    const start = BIWEEKLY_EPOCH.add(blockIndex * 2, 'week')
    return { start, end: start.add(13, 'day') }
  }

  return { start: anchor.startOf('month'), end: anchor.endOf('month') }
}

function shiftAnchor(type: TimesheetPeriodType, anchor: Dayjs, direction: 1 | -1): Dayjs {
  if (type === 'weekly') return anchor.add(direction * 7, 'day')
  if (type === 'biweekly') return anchor.add(direction * 14, 'day')
  return anchor.add(direction, 'month')
}

export default function DownloadTimeSheetScreen() {
  const router = useRouter()

  const [periodType, setPeriodType] = useState<TimesheetPeriodType>('weekly')
  const [anchor, setAnchor] = useState(() => dayjs())
  const [downloading, setDownloading] = useState(false)

  const { start, end } = getPeriodRange(periodType, anchor)
  const startParam = start.format('YYYY-MM-DD')
  const endParam = end.format('YYYY-MM-DD')

  // Don't let a worker page into a period that hasn't happened yet.
  const isCurrentOrFuturePeriod = !end.isBefore(dayjs(), 'day')

  const { data, isLoading: summaryLoading } = useQuery({
    queryKey: ['timesheet-summary', periodType, startParam, endParam],
    queryFn: () => getTimesheetSummary({ period: periodType, start: startParam, end: endParam }),
  })

  const summary = data?.summary

  const selectPeriodType = (type: TimesheetPeriodType) => {
    setPeriodType(type)
    setAnchor(dayjs())
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const token = await getToken()
      const filename = `timesheet-${startParam}-${endParam}.pdf`
      const file = await File.downloadFileAsync(
        `${BASE_URL}/timesheets/me/pdf?startDate=${startParam}&endDate=${endParam}`,
        new File(Paths.cache as Directory, filename),
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined, idempotent: true }
      )

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Timesheet' })
      } else {
        Toast.show({ type: 'success', text1: 'Timesheet saved', text2: file.uri })
      }
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't generate timesheet", text2: 'Please try again.' })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={16} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Download size={15} color="#64748B" />
          </View>
          <View>
            <Text style={styles.title}>Download Timesheet</Text>
            <Text style={styles.subtitle}>Choose a period to generate and download</Text>
          </View>
        </View>

        <View style={styles.periodPicker}>
          {PERIOD_TYPES.map(p => (
            <Pressable
              key={p.id}
              onPress={() => selectPeriodType(p.id)}
              style={[styles.periodChip, periodType === p.id && styles.periodChipActive]}
            >
              <Text style={[styles.periodChipText, periodType === p.id && styles.periodChipTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.rangeCard}>
          <Pressable
            style={styles.rangeNavButton}
            onPress={() => setAnchor(a => shiftAnchor(periodType, a, -1))}
          >
            <ChevronLeft size={16} color="#94A3B8" />
          </Pressable>

          <View style={styles.rangeCenter}>
            <Text style={styles.rangeText}>
              {start.format('D MMM')} – {end.format('D MMM YYYY')}
            </Text>
            <Text style={styles.rangeLabel}>{PERIOD_TYPES.find(p => p.id === periodType)?.label}</Text>
          </View>

          <Pressable
            style={[styles.rangeNavButton, isCurrentOrFuturePeriod && styles.disabled]}
            disabled={isCurrentOrFuturePeriod}
            onPress={() => setAnchor(a => shiftAnchor(periodType, a, 1))}
          >
            <ChevronRight size={16} color="#94A3B8" />
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total hours</Text>
            <Text style={styles.summaryValue}>
              {summaryLoading ? '—' : formatDuration(summary?.totalMinutes)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>Shifts</Text>
            <Text style={styles.summaryValue}>{summaryLoading ? '—' : (summary?.totalJobs ?? 0)}</Text>
          </View>
        </View>

        {!summaryLoading && summary?.hasData && summary.assignments.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.shiftsHeading}>Shifts in this period</Text>
            {summary.assignments.map((a, i) => (
              <View
                key={a._id ?? i}
                style={[styles.shiftRow, i === summary.assignments.length - 1 && styles.summaryRowLast]}
              >
                <View style={styles.flex1}>
                  <Text style={styles.shiftTitle} numberOfLines={1}>
                    {a.title || 'Shift'}
                  </Text>
                  <Text style={styles.shiftDate}>{a.date ? formatDate(a.date, 'ddd, D MMM') : ''}</Text>
                </View>
                <Text style={styles.shiftMinutes}>{formatDuration(a.minutes)}</Text>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={[styles.downloadButton, (summaryLoading || downloading) && styles.disabled]}
          disabled={summaryLoading || downloading}
          onPress={handleDownload}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Download size={16} color="#fff" />
          )}
          <Text style={styles.downloadButtonText}>
            {downloading ? 'Generating…' : 'Download Timesheet'}
          </Text>
        </Pressable>

        {!summaryLoading && !summary?.totalJobs && (
          <Text style={styles.noShifts}>No shifts recorded in this period</Text>
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
    gap: 14,
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

  periodPicker: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },

  periodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },

  periodChipActive: {
    backgroundColor: '#FFFFFF',
  },

  periodChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  periodChipTextActive: {
    color: '#0F172A',
  },

  rangeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rangeNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rangeCenter: {
    alignItems: 'center',
  },

  rangeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  rangeLabel: {
    marginTop: 2,
    fontSize: 12,
    color: '#94A3B8',
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },

  summaryRowLast: {
    borderBottomWidth: 0,
  },

  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  shiftsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingTop: 13,
    paddingBottom: 8,
  },

  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },

  flex1: {
    flex: 1,
  },

  shiftTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },

  shiftDate: {
    marginTop: 2,
    fontSize: 11,
    color: '#94A3B8',
  },

  shiftMinutes: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  downloadButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1E3A5F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  downloadButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  noShifts: {
    marginTop: -6,
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
  },

  disabled: {
    opacity: 0.4,
  },
})

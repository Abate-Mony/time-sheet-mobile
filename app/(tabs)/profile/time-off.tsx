import { cancelTimeOffRequest, getMyTimeOffRequests, requestTimeOff } from '@/utils/api-request-functions'
import type { TimeOffRequest, TimeOffStatus, TimeOffType } from '@/utils/types'
import { useMutation, useQuery } from '@tanstack/react-query'
import DateTimePicker from '@react-native-community/datetimepicker'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { Briefcase, Calendar, CalendarDays, CalendarOff, ChevronLeft, X } from 'lucide-react-native'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const timeOffQuery = {
  queryKey: ['time-off', 'me'],
  queryFn: getMyTimeOffRequests,
}

const TYPES: { id: TimeOffType; label: string }[] = [
  { id: 'vacation', label: 'Vacation' },
  { id: 'sick', label: 'Sick' },
  { id: 'personal', label: 'Personal' },
  { id: 'other', label: 'Other' },
]

const STATUS_STYLES: Record<TimeOffStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
  approved: { bg: '#D1FAE5', text: '#047857', label: 'Approved' },
  rejected: { bg: '#FEE2E2', text: '#B91C1C', label: 'Declined' },
  cancelled: { bg: '#E2E8F0', text: '#475569', label: 'Cancelled' },
}

function DateField({
  label,
  value,
  minimumDate,
  onChange,
}: {
  label: string
  value: Date
  minimumDate?: Date
  onChange: (date: Date) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.dateField}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Pressable style={styles.dateInput} onPress={() => setOpen(true)}>
        <CalendarDays size={14} color="#64748B" />
        <Text style={styles.dateValue}>{dayjs(value).format('ddd, D MMM YYYY')}</Text>
      </Pressable>

      {open && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          onChange={(event, selected) => {
            // Android dismisses itself and always fires "set"/"dismissed";
            // iOS inline mode keeps firing "set" on every scroll and never
            // dismisses on its own — close only on Android, where a single
            // event is the whole interaction.
            if (Platform.OS === 'android') setOpen(false)
            if (event.type === 'set' && selected) onChange(selected)
          }}
        />
      )}

      {open && Platform.OS === 'ios' && (
        <Pressable style={styles.iosDoneButton} onPress={() => setOpen(false)}>
          <Text style={styles.iosDoneText}>Done</Text>
        </Pressable>
      )}
    </View>
  )
}

export default function TimeOffScreen() {
  const router = useRouter()

  const { data: requests, isLoading, isError, refetch } = useQuery(timeOffQuery)

  const [type, setType] = useState<TimeOffType>('vacation')
  const [startDate, setStartDate] = useState(() => dayjs().add(1, 'day').startOf('day').toDate())
  const [endDate, setEndDate] = useState(() => dayjs().add(1, 'day').startOf('day').toDate())
  const [reason, setReason] = useState('')

  const submitMutation = useMutation({
    mutationFn: () =>
      requestTimeOff({
        startDate: dayjs(startDate).format('YYYY-MM-DD'),
        endDate: dayjs(endDate).format('YYYY-MM-DD'),
        type,
        reason: reason.trim() || undefined,
      }),
    onSuccess: success => {
      if (!success) return
      setReason('')
      setType('vacation')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelTimeOffRequest(id),
  })

  const handleStartChange = (date: Date) => {
    setStartDate(date)
    if (dayjs(endDate).isBefore(date, 'day')) setEndDate(date)
  }

  const handleSubmit = () => {
    if (dayjs(endDate).isBefore(startDate, 'day')) {
      Alert.alert('Check your dates', 'End date must be on or after the start date.')
      return
    }
    submitMutation.mutate()
  }

  const handleCancel = (request: TimeOffRequest) => {
    Alert.alert('Cancel request', 'Cancel this time-off request?', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel request', style: 'destructive', onPress: () => cancelMutation.mutate(request._id) },
    ])
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={16} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <CalendarOff size={15} color="#64748B" />
          </View>
          <View>
            <Text style={styles.title}>Time Off</Text>
            <Text style={styles.subtitle}>Request time off and track your requests</Text>
          </View>
        </View>

        {/* New request form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Request</Text>

          <View style={styles.typeRow}>
            {TYPES.map(t => (
              <Pressable
                key={t.id}
                onPress={() => setType(t.id)}
                style={[styles.typeChip, type === t.id && styles.typeChipActive]}
              >
                <Text style={[styles.typeChipText, type === t.id && styles.typeChipTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <DateField label="Start date" value={startDate} minimumDate={new Date()} onChange={handleStartChange} />
          <DateField label="End date" value={endDate} minimumDate={startDate} onChange={setEndDate} />

          <Text style={styles.dateLabel}>Reason (optional)</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Let your manager know why..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={styles.textArea}
          />

          <Pressable
            style={[styles.submitButton, submitMutation.isPending && styles.disabled]}
            onPress={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Request</Text>
            )}
          </Pressable>
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>Your Requests</Text>

        {isLoading ? (
          <ActivityIndicator size="small" color="#1E3A5F" style={{ marginTop: 12 }} />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Couldn't load your requests.</Text>
            <Pressable onPress={() => refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : !requests?.length ? (
          <View style={styles.empty}>
            <Calendar size={28} color="#CBD5E1" />
            <Text style={styles.emptyText}>No time-off requests yet</Text>
          </View>
        ) : (
          requests.map(request => {
            const statusStyle = STATUS_STYLES[request.status]
            const range =
              dayjs(request.startDate).isSame(request.endDate, 'day')
                ? dayjs(request.startDate).format('ddd, D MMM YYYY')
                : `${dayjs(request.startDate).format('D MMM')} – ${dayjs(request.endDate).format('D MMM YYYY')}`

            return (
              <View key={request._id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestIcon}>
                    <Briefcase size={13} color="#1E3A5F" />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.requestRange}>{range}</Text>
                    <Text style={styles.requestType}>{TYPES.find(t => t.id === request.type)?.label ?? 'Other'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                  </View>
                </View>

                {!!request.reason && <Text style={styles.requestReason}>{request.reason}</Text>}

                {!!request.managerNotes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>Manager: {request.managerNotes}</Text>
                  </View>
                )}

                {request.status === 'pending' && (
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => handleCancel(request)}
                    disabled={cancelMutation.isPending}
                  >
                    <X size={12} color="#B91C1C" />
                    <Text style={styles.cancelButtonText}>Cancel request</Text>
                  </Pressable>
                )}
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },

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

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeChipActive: { backgroundColor: '#1E3A5F', borderColor: '#1E3A5F' },
  typeChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  typeChipTextActive: { color: '#FFFFFF' },

  dateField: { gap: 6 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  dateValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },

  iosDoneButton: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 12 },
  iosDoneText: { fontSize: 13, fontWeight: '700', color: '#1E3A5F' },

  textArea: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    color: '#334155',
    fontSize: 14,
  },

  submitButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 },

  empty: { marginTop: 12, alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyText: { fontSize: 13, color: '#94A3B8' },
  retryText: { fontSize: 13, fontWeight: '700', color: '#1E3A5F' },

  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#E8EEF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: { flex: 1 },
  requestRange: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  requestType: { marginTop: 2, fontSize: 11, color: '#94A3B8', textTransform: 'capitalize' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  requestReason: { fontSize: 12, color: '#475569', lineHeight: 17 },

  notesBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10 },
  notesText: { fontSize: 12, color: '#475569', lineHeight: 17 },

  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  cancelButtonText: { fontSize: 12, fontWeight: '700', color: '#B91C1C' },
})

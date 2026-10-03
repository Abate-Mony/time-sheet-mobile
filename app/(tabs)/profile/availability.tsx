import { useTabBarClearance } from '@/hooks/useTabBarClearance'
import { getMyAvailability, updateMyAvailability } from '@/utils/api-request-functions'
import type { AvailabilityDay, AvailabilityDayStatus } from '@/utils/types'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { AlertCircle, ChevronLeft, Clock, Info } from 'lucide-react-native'
import { useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const STATUS_OPTIONS: { value: AvailabilityDayStatus; label: string }[] = [
  { value: 'available', label: 'Any time' },
  { value: 'hours', label: 'Set hours' },
  { value: 'unavailable', label: 'Off' },
]

const DEFAULT_START = '09:00'
const DEFAULT_END = '17:00'

const toDate = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return dayjs().hour(h).minute(m).second(0).toDate()
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.timeField}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Pressable style={styles.timeInput} onPress={() => setOpen(true)}>
        <Clock size={13} color="#64748B" />
        <Text style={styles.timeValue}>{value}</Text>
      </Pressable>

      {open && (
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          is24Hour
          minuteInterval={15}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selected) => {
            // Same Android/iOS split as time-off.tsx's DateField: Android
            // fires once and dismisses itself; iOS keeps firing while open.
            if (Platform.OS === 'android') setOpen(false)
            if (event.type === 'set' && selected) onChange(dayjs(selected).format('HH:mm'))
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

export default function AvailabilityScreen() {
  const router = useRouter()
  const tabBarClearance = useTabBarClearance(0)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['availability', 'me'],
    queryFn: getMyAvailability,
  })

  // Unsaved edits. null = nothing changed yet, show what the server has.
  const [draftDays, setDraftDays] = useState<AvailabilityDay[] | null>(null)
  const [draftNote, setDraftNote] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const days = draftDays ?? data?.days ?? []
  const note = draftNote ?? data?.note ?? ''
  const isDirty = draftDays !== null || draftNote !== null

  const invalidDay = days.find(d => d.status === 'hours' && (!d.start || !d.end || d.start >= d.end))

  const updateDay = (day: number, patch: Partial<AvailabilityDay>) => {
    setDraftDays(days.map(d => (d.day === day ? { ...d, ...patch } : d)))
  }

  const setStatus = (day: AvailabilityDay, status: AvailabilityDayStatus) => {
    updateDay(day.day, status === 'hours'
      ? { status, start: day.start ?? DEFAULT_START, end: day.end ?? DEFAULT_END }
      : { status, start: null, end: null })
  }

  const save = async () => {
    setSaving(true)
    const ok = await updateMyAvailability(days, note.trim())
    setSaving(false)
    if (ok) {
      setDraftDays(null)
      setDraftNote(null)
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={18} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Availability</Text>
        <Text style={styles.subtitle}>Your usual week — managers see this when assigning shifts</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1E3A5F" />
      ) : isError || !data ? (
        <View style={styles.empty}>
          <AlertCircle size={20} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Couldn&apos;t load your availability</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance + 90 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.infoBox}>
              <Info size={15} color="#1E40AF" style={{ marginTop: 1 }} />
              <Text style={styles.infoText}>
                This is a guide, not a block — your manager can still offer you shifts outside it. For specific
                dates like holidays, request Time Off instead.
              </Text>
            </View>

            {days.map(day => (
              <View key={day.day} style={styles.dayCard}>
                <Text style={styles.dayName}>{DAY_NAMES[day.day]}</Text>

                <View style={styles.segment}>
                  {STATUS_OPTIONS.map(opt => {
                    const active = day.status === opt.value
                    return (
                      <Pressable
                        key={opt.value}
                        style={[
                          styles.segmentItem,
                          active && styles.segmentItemActive,
                          active && opt.value === 'unavailable' && styles.segmentItemOff,
                        ]}
                        onPress={() => setStatus(day, opt.value)}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            active && styles.segmentTextActive,
                            active && opt.value === 'unavailable' && styles.segmentTextOff,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>

                {day.status === 'hours' && (
                  <>
                    <View style={styles.timeRow}>
                      <TimeField label="From" value={day.start ?? DEFAULT_START} onChange={v => updateDay(day.day, { start: v })} />
                      <TimeField label="Until" value={day.end ?? DEFAULT_END} onChange={v => updateDay(day.day, { end: v })} />
                    </View>
                    {invalidDay?.day === day.day && <Text style={styles.errorText}>End time must be after start time.</Text>}
                  </>
                )}
              </View>
            ))}

            <View style={styles.dayCard}>
              <Text style={styles.dayName}>
                Note for your manager <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                value={note}
                onChangeText={t => setDraftNote(t.slice(0, 300))}
                placeholder="e.g. Can do extra weekends during school holidays"
                placeholderTextColor="#94A3B8"
                multiline
                style={styles.noteInput}
              />
            </View>

            {!!data.updatedAt && !isDirty && (
              <Text style={styles.updatedAt}>Last updated {dayjs(data.updatedAt).format('D MMM YYYY')}</Text>
            )}
          </ScrollView>

          {isDirty && (
            <View style={[styles.footer, { bottom: tabBarClearance }]}>
              <Pressable
                style={styles.discardButton}
                disabled={saving}
                onPress={() => {
                  setDraftDays(null)
                  setDraftNote(null)
                }}
              >
                <Text style={styles.discardText}>Discard</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, (saving || !!invalidDay) && styles.disabled]}
                disabled={saving || !!invalidDay}
                onPress={save}
              >
                {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveText}>Save availability</Text>}
              </Pressable>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },

  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2, marginBottom: 2 },
  backText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#94A3B8' },

  content: { padding: 16, paddingTop: 12, gap: 10 },

  infoBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#1E40AF' },

  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  dayName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  optional: { fontSize: 12, fontWeight: '500', color: '#94A3B8' },

  segment: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3 },
  segmentItem: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#1E3A5F' },
  segmentItemOff: { backgroundColor: '#FEE2E2' },
  segmentText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  segmentTextActive: { color: '#FFFFFF' },
  segmentTextOff: { color: '#B91C1C' },

  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1, gap: 4 },
  timeLabel: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  timeValue: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  iosDoneButton: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6 },
  iosDoneText: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  errorText: { fontSize: 12, color: '#DC2626' },

  noteInput: {
    minHeight: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
  },

  updatedAt: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 4 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  discardButton: {
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  saveButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  disabled: { opacity: 0.5 },

  empty: { marginTop: 40, alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  retryText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
})

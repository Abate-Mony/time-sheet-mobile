import { activeWorkerJob } from '@/app/(tabs)/clock'
import { Avatar } from '@/components/avatar'
import { useTabBarClearance } from '@/hooks/useTabBarClearance'
import customFetch from '@/utils/customFetch'
import type { JobSiteSnapshot, ManagerContact, MyContactsResponse, SiteContact } from '@/utils/types'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  UserX,
  type LucideIcon,
} from 'lucide-react-native'
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const ROLE_LABEL: Record<ManagerContact['role'], string> = {
  manager: 'Manager',
  admin: 'Admin',
  owner: 'Owner',
}

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()

// Phone numbers arrive formatted however someone typed them; tel:/sms: need
// just the digits (and a leading +).
const dialable = (phone: string) => phone.replace(/[^\d+]/g, '')

async function openLink(url: string, fallbackMessage: string) {
  try {
    await Linking.openURL(url)
  } catch {
    Alert.alert("Couldn't open that", fallbackMessage)
  }
}

function ActionButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon
  label: string
  onPress?: () => void
}) {
  const disabled = !onPress
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.action, disabled && styles.actionDisabled, pressed && styles.actionPressed]}
    >
      <Icon size={15} color={disabled ? '#CBD5E1' : '#1E3A5F'} />
      <Text style={[styles.actionText, disabled && styles.actionTextDisabled]}>{label}</Text>
    </Pressable>
  )
}

// Call / Text / Email for one person. A missing number or email greys that
// button out rather than hiding it, so the row reads the same for everyone.
function ContactActions({ phone, email }: { phone?: string | null; email?: string | null }) {
  return (
    <View style={styles.actions}>
      <ActionButton
        icon={Phone}
        label="Call"
        onPress={phone ? () => openLink(`tel:${dialable(phone)}`, `You can call ${phone} manually.`) : undefined}
      />
      <ActionButton
        icon={MessageSquare}
        label="Text"
        onPress={phone ? () => openLink(`sms:${dialable(phone)}`, `You can text ${phone} manually.`) : undefined}
      />
      <ActionButton
        icon={Mail}
        label="Email"
        onPress={email ? () => openLink(`mailto:${email}`, `You can email ${email} manually.`) : undefined}
      />
    </View>
  )
}

function ManagerCard({ manager }: { manager: ManagerContact }) {
  const details = [manager.phone, manager.email].filter(Boolean).join(' · ')
  return (
    <View style={styles.card}>
      <View style={styles.personRow}>
        <Avatar initials={initialsOf(manager.fullname)} src={manager.photoUrl} />
        <View style={styles.flex1}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{manager.fullname}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{ROLE_LABEL[manager.role] ?? manager.role}</Text>
            </View>
          </View>
          <Text style={styles.detail} numberOfLines={1}>{details || 'No contact details added yet'}</Text>
        </View>
      </View>
      <ContactActions phone={manager.phone} email={manager.email} />
    </View>
  )
}

function SiteContactCard({ contact, siteName }: { contact: SiteContact; siteName: string }) {
  return (
    <View style={[styles.card, styles.siteCard]}>
      <View style={styles.siteHeader}>
        <MapPin size={13} color="#047857" />
        <Text style={styles.siteHeaderText} numberOfLines={1}>On site now · {siteName}</Text>
      </View>
      <Text style={styles.name}>{contact.name || 'Site contact'}</Text>
      {!!(contact.phone || contact.email) && (
        <Text style={styles.detail} numberOfLines={1}>{[contact.phone, contact.email].filter(Boolean).join(' · ')}</Text>
      )}
      <ContactActions phone={contact.phone} email={contact.email} />
    </View>
  )
}

export default function ContactManagerScreen() {
  const router = useRouter()
  const tabBarClearance = useTabBarClearance()

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['my-contacts'],
    queryFn: async () => {
      const { data } = await customFetch.get<MyContactsResponse>('/workers/me/contacts')
      return data
    },
  })

  // The shift the worker is on right now, if any — its site contact is often
  // the quickest person to reach about something happening on site.
  const { data: active } = useQuery(activeWorkerJob())
  const activeJob = active && 'job' in active ? (active.job as typeof active.job & { siteSnapshot?: JobSiteSnapshot | null }) : null
  const siteContact = activeJob?.siteSnapshot?.contact
  const hasSiteContact = !!(siteContact?.phone || siteContact?.email)

  const company = data?.company
  const managers = data?.managers ?? []

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={18} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Contact Manager</Text>
        <Text style={styles.subtitle}>
          {company ? `Get in touch with the team at ${company.name}` : 'Get in touch with your team'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#1E3A5F" />}
      >
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#1E3A5F" />
        ) : isError || !data ? (
          <View style={styles.empty}>
            <AlertCircle size={20} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Couldn&apos;t load your contacts</Text>
            <Text style={styles.emptyText}>Pull to refresh or try again shortly.</Text>
          </View>
        ) : (
          <>
            {hasSiteContact && activeJob && (
              <SiteContactCard contact={siteContact!} siteName={activeJob.siteSnapshot?.name || activeJob.title} />
            )}

            <Text style={styles.sectionTitle}>Your managers</Text>
            {managers.length === 0 ? (
              <View style={[styles.card, styles.emptyCard]}>
                <UserX size={18} color="#94A3B8" />
                <Text style={styles.emptyText}>No managers are listed for your company yet.</Text>
              </View>
            ) : (
              managers.map(m => <ManagerCard key={m._id} manager={m} />)
            )}

            {company && (company.phone || company.website) && (
              <>
                <Text style={styles.sectionTitle}>Company</Text>
                <View style={styles.card}>
                  <View style={styles.personRow}>
                    <Avatar initials={initialsOf(company.name)} src={company.logoUrl} />
                    <View style={styles.flex1}>
                      <Text style={styles.name} numberOfLines={1}>{company.name}</Text>
                      {!!company.phone && <Text style={styles.detail}>{company.phone}</Text>}
                    </View>
                    <Building2 size={16} color="#94A3B8" />
                  </View>
                  <View style={styles.actions}>
                    <ActionButton
                      icon={Phone}
                      label="Call office"
                      onPress={company.phone ? () => openLink(`tel:${dialable(company.phone!)}`, `You can call ${company.phone} manually.`) : undefined}
                    />
                    {!!company.website && (
                      <ActionButton
                        icon={Globe}
                        label="Website"
                        onPress={() => {
                          const url = /^https?:\/\//i.test(company.website!) ? company.website! : `https://${company.website}`
                          openLink(url, `You can visit ${company.website} in your browser.`)
                        }}
                      />
                    )}
                  </View>
                </View>
              </>
            )}

            <Text style={styles.footnote}>
              Can&apos;t make a shift? You can also release it or offer it to colleagues from the shift itself, or
              request time off in Profile.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F5' },
  flex1: { flex: 1, minWidth: 0 },

  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2, marginBottom: 2 },
  backText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#94A3B8' },

  content: { padding: 16, paddingTop: 12, gap: 10, flexGrow: 1 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 8,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },

  siteCard: { borderColor: '#A7F3D0', backgroundColor: '#F0FDF9', gap: 6 },
  siteHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  siteHeaderText: { flex: 1, fontSize: 11, fontWeight: '700', color: '#047857', textTransform: 'uppercase', letterSpacing: 0.4 },

  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: '#0F172A' },
  detail: { fontSize: 12, color: '#64748B', marginTop: 2 },

  roleBadge: { backgroundColor: '#EFF6FF', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: '#1D4ED8' },

  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
  },
  actionPressed: { backgroundColor: '#DBEAFE' },
  actionDisabled: { backgroundColor: '#F8FAFC' },
  actionText: { fontSize: 13, fontWeight: '700', color: '#1E3A5F' },
  actionTextDisabled: { color: '#CBD5E1' },

  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  empty: { marginTop: 40, alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  emptyText: { flex: 1, fontSize: 12, color: '#94A3B8', textAlign: 'center' },

  footnote: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 12, paddingHorizontal: 12, lineHeight: 16 },
})

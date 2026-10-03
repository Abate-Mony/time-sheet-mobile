import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationLinkToRoute,
  useNotificationsInbox,
} from '@/hooks/useNotifications'
import type { InboxNotification } from '@/utils/types'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { AlertCircle, BellOff, CheckCheck, ChevronLeft, Settings2 } from 'lucide-react-native'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

function timeAgo(iso: string) {
  const mins = dayjs().diff(dayjs(iso), 'minute')
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return dayjs(iso).format('D MMM')
}

export default function InboxScreen() {
  const router = useRouter()
  const { data, isLoading, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotificationsInbox()

  const notifications = data?.pages.flatMap(p => p.notifications) ?? []
  const unreadCount = data?.pages[0]?.unreadCount ?? 0

  const open = (n: InboxNotification) => {
    if (!n.isRead) markNotificationRead(n._id)
    const route = notificationLinkToRoute(n.link)
    if (route) router.push(route as any)
  }

  const renderItem = ({ item }: { item: InboxNotification }) => (
    <Pressable style={[styles.item, !item.isRead && styles.itemUnread]} onPress={() => open(item)}>
      <View style={[styles.dot, !item.isRead && styles.dotUnread]} />
      <View style={styles.itemBody}>
        <View style={styles.itemTop}>
          <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.itemText}>{item.body}</Text>
      </View>
    </Pressable>
  )

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={18} color="#64748B" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <Pressable style={styles.iconButton} onPress={markAllNotificationsRead} hitSlop={6}>
                <CheckCheck size={16} color="#1E3A5F" />
              </Pressable>
            )}
            <Pressable
              style={styles.iconButton}
              onPress={() => router.push('/(tabs)/profile/notifications')}
              hitSlop={6}
            >
              <Settings2 size={16} color="#1E3A5F" />
            </Pressable>
          </View>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1E3A5F" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => n._id}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#1E3A5F" />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 16 }} color="#1E3A5F" /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              {isError ? <AlertCircle size={20} color="#94A3B8" /> : <BellOff size={20} color="#94A3B8" />}
              <Text style={styles.emptyTitle}>
                {isError ? 'Couldn’t load notifications' : 'No notifications yet'}
              </Text>
              <Text style={styles.emptyText}>
                {isError
                  ? 'Pull to refresh or try again shortly.'
                  : 'New shifts, schedule changes and claim updates will show up here.'}
              </Text>
            </View>
          }
        />
      )}
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
    gap: 6,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
  },

  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 8,
    flexGrow: 1,
  },

  item: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },

  itemUnread: {
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FBFF',
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    backgroundColor: 'transparent',
  },

  dotUnread: {
    backgroundColor: '#2563EB',
  },

  itemBody: {
    flex: 1,
    gap: 3,
  },

  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },

  itemTitleUnread: {
    fontWeight: '700',
    color: '#0F172A',
  },

  itemTime: {
    fontSize: 11,
    color: '#94A3B8',
  },

  itemText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
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
})

import { queryClient } from '@/lib/queryClient'
import customFetch from '@/utils/customFetch'
import type { NotificationsPage } from '@/utils/types'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

// Every inbox query lives under ["notifications"], so one invalidation
// refreshes both the list and the bell's unread badge.
const PAGE_SIZE = 20

export function useNotificationsInbox() {
  return useInfiniteQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async ({ pageParam }) => {
      const { data } = await customFetch.get<NotificationsPage>('/notifications', {
        params: { page: pageParam, limit: PAGE_SIZE },
      })
      return data
    },
    initialPageParam: 1,
    getNextPageParam: last => (last.page < last.totalPages ? last.page + 1 : undefined),
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const { data } = await customFetch.get<NotificationsPage>('/notifications', { params: { limit: 1 } })
      return data.unreadCount
    },
  })
}

export async function markNotificationRead(id: string) {
  try {
    await customFetch.patch(`/notifications/${id}/read`)
  } catch {
    // Non-critical — the next refetch shows the real read state.
  } finally {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }
}

export async function markAllNotificationsRead() {
  try {
    await customFetch.patch('/notifications/read-all')
  } catch {
    // Non-critical — the next refetch shows the real read state.
  } finally {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }
}

// Notification links are the same web-style paths push payloads carry
// ("/worker/jobs/<id>", "/worker/profile", ...). Mirrors app/worker/[...path].tsx:
// this app's routes have no "/worker" prefix, so it's stripped. Links
// without that prefix are manager-side web routes with no screen here.
export function notificationLinkToRoute(link: string | null): string | null {
  if (!link?.startsWith('/worker')) return null
  return link.slice('/worker'.length) || '/'
}

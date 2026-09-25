import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '../lib/api'
import { useNotificationStore } from '../store/notificationStore'

export interface Notification {
  id: string
  type: string
  message: string
  is_read: boolean
  ticket_id: string | null
  project_id: string | null
  actor: { id: string; full_name: string } | null
  created_at: string
}

export function useUnreadCount() {
  const setUnreadCount = useNotificationStore(s => s.setUnreadCount)

  const query = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count').then(r => r.data.count),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (query.data != null) setUnreadCount(query.data)
  }, [query.data, setUnreadCount])

  return query
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications').then(r => r.data),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.setQueryData(['notifications', 'unread-count'], 0)
    },
  })
}

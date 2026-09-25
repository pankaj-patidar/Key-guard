import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface ActivityEntry {
  id: string
  ticket_id: string
  actor: { id: string; full_name: string; avatar_url: string | null }
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

export function useActivity(projectId: string, ticketNumber: number) {
  return useQuery({
    queryKey: ['projects', projectId, 'tickets', ticketNumber, 'activity'],
    queryFn: () =>
      api.get<ActivityEntry[]>(`/projects/${projectId}/tickets/${ticketNumber}/activity`).then(r => r.data),
    enabled: !!ticketNumber,
  })
}

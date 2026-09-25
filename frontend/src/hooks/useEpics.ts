import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface Epic {
  id: string
  ticket_number: number
  project_id: string
  title: string
  is_archived: boolean
  created_at: string
  total_tickets: number
  done_tickets: number
}

const key = (projectId: string) => ['projects', projectId, 'epics']

export function useEpics(projectId: string) {
  return useQuery({
    queryKey: key(projectId),
    queryFn: () => api.get<Epic[]>(`/projects/${projectId}/epics`).then(r => r.data),
  })
}

export function useCreateEpic(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string }) =>
      api.post<Epic>(`/projects/${projectId}/epics`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  })
}

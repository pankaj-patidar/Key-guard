import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface Comment {
  id: string
  ticket_id: string
  author: { id: string; full_name: string; avatar_url: string | null }
  content: Record<string, unknown>
  parent_id: string | null
  is_edited: boolean
  created_at: string
  updated_at: string
}

const key = (projectId: string, ticketNumber: number) =>
  ['projects', projectId, 'tickets', ticketNumber, 'comments']

export function useComments(projectId: string, ticketNumber: number) {
  return useQuery({
    queryKey: key(projectId, ticketNumber),
    queryFn: () =>
      api.get<Comment[]>(`/projects/${projectId}/tickets/${ticketNumber}/comments`).then(r => r.data),
    enabled: !!ticketNumber,
  })
}

export function useCreateComment(projectId: string, ticketNumber: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { content: Record<string, unknown>; parent_id?: string }) =>
      api.post<Comment>(`/projects/${projectId}/tickets/${ticketNumber}/comments`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId, ticketNumber) }),
  })
}

export function useDeleteComment(projectId: string, ticketNumber: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) =>
      api.delete(`/projects/${projectId}/tickets/${ticketNumber}/comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId, ticketNumber) }),
  })
}

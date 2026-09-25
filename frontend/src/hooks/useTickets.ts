import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Ticket } from '../store/boardStore'

export type { Ticket }

const key = (projectId: string) => ['projects', projectId, 'tickets']

export function useTickets(projectId: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: [...key(projectId), params],
    queryFn: () => api.get<Ticket[]>(`/projects/${projectId}/tickets`, { params }).then(r => r.data),
  })
}

export function useTicket(projectId: string, ticketNumber: number) {
  return useQuery({
    queryKey: [...key(projectId), ticketNumber],
    queryFn: () => api.get<Ticket>(`/projects/${projectId}/tickets/${ticketNumber}`).then(r => r.data),
    enabled: !!ticketNumber,
  })
}

export function useCreateTicket(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Ticket> & { title: string; type: string }) =>
      api.post<Ticket>(`/projects/${projectId}/tickets`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(projectId) })
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'board'] })
    },
  })
}

export function useUpdateTicket(projectId: string, ticketNumber: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Ticket>) =>
      api.patch<Ticket>(`/projects/${projectId}/tickets/${ticketNumber}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(projectId) })
      qc.invalidateQueries({ queryKey: [...key(projectId), ticketNumber] })
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'board'] })
    },
  })
}

export function useDeleteTicket(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ticketNumber: number) =>
      api.delete(`/projects/${projectId}/tickets/${ticketNumber}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(projectId) })
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'board'] })
    },
  })
}

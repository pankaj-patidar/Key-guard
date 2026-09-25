import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface Sprint {
  id: string
  ticket_number: number
  project_id: string
  title: string
  start_date: string | null
  end_date: string | null
  goal: string | null
  is_active: boolean
  created_at: string
}

const key = (projectId: string) => ['projects', projectId, 'sprints']

export function useSprints(projectId: string) {
  return useQuery({
    queryKey: key(projectId),
    queryFn: () => api.get<Sprint[]>(`/projects/${projectId}/sprints`).then(r => r.data),
  })
}

export function useActiveSprint(projectId: string) {
  const { data: sprints = [] } = useSprints(projectId)
  return sprints.find(s => s.is_active) ?? null
}

export function useCreateSprint(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; start_date?: string; end_date?: string; goal?: string }) =>
      api.post<Sprint>(`/projects/${projectId}/sprints`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  })
}

export function useActivateSprint(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) =>
      api.post<Sprint>(`/projects/${projectId}/sprints/${sprintId}/activate`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  })
}

export function useCloseSprint(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) =>
      api.post<Sprint>(`/projects/${projectId}/sprints/${sprintId}/close`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(projectId) })
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'board'] })
    },
  })
}

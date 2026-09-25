import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import toast from 'react-hot-toast'

export interface SystemSetting {
  key: string
  value: string
  value_type: 'string' | 'integer' | 'boolean' | 'json'
  label: string
  description: string | null
  module: string
  is_sensitive: boolean
}

export function useSystemSettings(module?: string) {
  return useQuery({
    queryKey: ['admin', 'settings', module],
    queryFn: () =>
      api.get<SystemSetting[]>('/admin/settings', { params: module ? { module } : undefined })
         .then(r => r.data),
  })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.patch<SystemSetting>(`/admin/settings/${key}`, { value }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      qc.invalidateQueries({ queryKey: ['settings', 'public'] })
      toast.success('Setting updated', { duration: 1500 })
    },
    onError: () => toast.error('Failed to save setting'),
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface Permission {
  id: string
  key: string
  description: string
  module: string
}

export interface Role {
  id: string
  name: string
  slug: string
  color: string
  description: string | null
  is_system: boolean
  created_at: string
  permissions: Permission[]
}

export interface RoleCreate {
  name: string
  color?: string
  description?: string
  permission_keys?: string[]
}

const ROLES_KEY = ['roles']

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => api.get<Role[]>('/roles').then(r => r.data),
  })
}

export function useRole(roleId: string) {
  return useQuery({
    queryKey: [...ROLES_KEY, roleId],
    queryFn: () => api.get<Role>(`/roles/${roleId}`).then(r => r.data),
    enabled: !!roleId,
  })
}

export function usePermissionKeys() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: () => api.get<Permission[]>('/permissions').then(r => r.data),
    staleTime: Infinity,
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RoleCreate) => api.post<Role>('/roles', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROLES_KEY }),
  })
}

export function useUpdateRolePermissions(roleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (permissionKeys: string[]) =>
      api.put<Role>(`/roles/${roleId}/permissions`, { permission_keys: permissionKeys }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES_KEY })
      qc.invalidateQueries({ queryKey: [...ROLES_KEY, roleId] })
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => api.delete(`/roles/${roleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROLES_KEY }),
  })
}

export function useSetProjectMemberRole(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      api.put(`/projects/${projectId}/members/${userId}/role`, { role_id: roleId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'members'] }),
  })
}

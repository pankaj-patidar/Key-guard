import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

interface MyPermissions {
  project_id: string | null
  role_slug: string
  permissions: string[]
}

export function usePermissions(projectId: string | null) {
  const { data } = useQuery({
    queryKey: ['permissions', 'me', projectId],
    queryFn: () =>
      projectId
        ? api.get<MyPermissions>(`/projects/${projectId}/my-permissions`).then(r => r.data)
        : Promise.resolve({ project_id: null, role_slug: 'none', permissions: [] }),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })

  const can = (permissionKey: string): boolean => {
    return data?.permissions.includes(permissionKey) ?? false
  }

  return { can, roleSlug: data?.role_slug ?? null, isLoading: !data }
}

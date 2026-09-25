import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useSettingsStore } from '../store/settingsStore'

export function usePublicSettings() {
  const setSettings = useSettingsStore(s => s.setSettings)

  const query = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => api.get('/settings/public').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (query.data) {
      setSettings(query.data)
      if (query.data.app_name) document.title = query.data.app_name
    }
  }, [query.data, setSettings])

  return query
}

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '../lib/api'
import { useBoardStore, BoardColumn, Ticket } from '../store/boardStore'

export type { Ticket, BoardColumn }

export interface BoardOut {
  columns: BoardColumn[]
}

export function useBoard(projectId: string) {
  const setColumns = useBoardStore(s => s.setColumns)

  const query = useQuery({
    queryKey: ['projects', projectId, 'board'],
    queryFn: () => api.get<BoardOut>(`/projects/${projectId}/board`).then(r => r.data),
    refetchInterval: 30_000,
    enabled: !!projectId,
  })

  useEffect(() => {
    if (query.data) setColumns(query.data.columns)
  }, [query.data, setColumns])

  return query
}

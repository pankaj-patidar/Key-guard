import { create } from 'zustand'

export interface Ticket {
  id: string
  ticket_number: number
  project_id: string
  title: string
  type: 'epic' | 'sprint' | 'bug' | 'task' | 'todo'
  status: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  description: Record<string, unknown> | null
  epic_id: string | null
  sprint_id: string | null
  assignee: { id: string; full_name: string; avatar_url: string | null } | null
  owner: { id: string; full_name: string; avatar_url: string | null } | null
  reporter: { id: string; full_name: string; avatar_url: string | null } | null
  story_points: number | null
  due_date: string | null
  position: number
  is_archived: boolean
  labels: { id: string; name: string; color: string }[]
  sprint_detail: { start_date: string; end_date: string; goal: string; is_active: boolean } | null
  created_at: string
  updated_at: string
}

export interface BoardColumn {
  status: string
  tickets: Ticket[]
}

interface BoardState {
  columns: BoardColumn[]
  setColumns: (columns: BoardColumn[]) => void
  moveTicket: (ticketId: string, fromStatus: string, toStatus: string, newPosition: number) => void
}

export const useBoardStore = create<BoardState>((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns }),
  moveTicket: (ticketId, fromStatus, toStatus, newPosition) =>
    set((state) => {
      const columns = state.columns.map(col => ({ ...col, tickets: [...col.tickets] }))
      let moved: Ticket | undefined
      const fromCol = columns.find(c => c.status === fromStatus)
      if (fromCol) {
        const idx = fromCol.tickets.findIndex(t => t.id === ticketId)
        if (idx !== -1) {
          moved = { ...fromCol.tickets[idx], status: toStatus, position: newPosition }
          fromCol.tickets.splice(idx, 1)
        }
      }
      if (moved) {
        const toCol = columns.find(c => c.status === toStatus)
        if (toCol) {
          const insertAt = toCol.tickets.findIndex(t => t.position > newPosition)
          if (insertAt === -1) toCol.tickets.push(moved)
          else toCol.tickets.splice(insertAt, 0, moved)
        }
      }
      return { columns }
    }),
}))

import React, { useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, PointerSensor,
  useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { useBoardStore, Ticket } from '../../store/boardStore'
import { KanbanColumn } from './KanbanColumn'
import { TicketCard } from '../tickets/TicketCard'
import { api } from '../../lib/api'
import toast from 'react-hot-toast'

const BOARD_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done']

interface Props {
  projectId: string
  onTicketClick: (ticket: Ticket) => void
  onAddTicket: (status: string) => void
}

export function KanbanBoard({ projectId, onTicketClick, onAddTicket }: Props) {
  const columns = useBoardStore(s => s.columns)
  const moveTicket = useBoardStore(s => s.moveTicket)
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const findTicket = (id: string): Ticket | undefined => {
    for (const col of columns) {
      const t = col.tickets.find(t => t.id === id)
      if (t) return t
    }
  }

  const findStatus = (id: string): string | undefined => {
    for (const col of columns) {
      if (col.status === id) return col.status
      if (col.tickets.find(t => t.id === id)) return col.status
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTicket(null)
    if (!over) return

    const ticket = findTicket(active.id as string)
    if (!ticket) return

    const fromStatus = findStatus(active.id as string)
    const toStatus = findStatus(over.id as string) ?? (over.id as string)
    if (!fromStatus || !toStatus) return

    const toCol = columns.find(c => c.status === toStatus)
    if (!toCol) return

    const overTicket = toCol.tickets.find(t => t.id === over.id)
    const overIdx = overTicket ? toCol.tickets.indexOf(overTicket) : toCol.tickets.length
    const prev = toCol.tickets[overIdx - 1]?.position ?? 0
    const next = toCol.tickets[overIdx]?.position ?? (prev + 2)
    const newPosition = (prev + next) / 2

    moveTicket(ticket.id, fromStatus, toStatus, newPosition)

    try {
      await api.patch(
        `/projects/${projectId}/tickets/${ticket.ticket_number}`,
        { status: toStatus, position: newPosition }
      )
    } catch {
      toast.error('Failed to move ticket')
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={e => setActiveTicket(findTicket(e.active.id as string) ?? null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
        {BOARD_STATUSES.map(status => {
          const col = columns.find(c => c.status === status)
          return (
            <KanbanColumn
              key={status}
              status={status}
              tickets={col?.tickets ?? []}
              onTicketClick={onTicketClick}
              onAddTicket={onAddTicket}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activeTicket && <TicketCard ticket={activeTicket} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  )
}

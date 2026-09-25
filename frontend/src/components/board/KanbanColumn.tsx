import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import { Ticket } from '../../store/boardStore'
import { TicketCard } from '../tickets/TicketCard'
import { TicketStatusBadge } from '../tickets/TicketStatusBadge'

function SortableTicketCard({ ticket, onClick }: { ticket: Ticket; onClick: (t: Ticket) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TicketCard ticket={ticket} onClick={onClick} />
    </div>
  )
}

interface Props {
  status: string
  tickets: Ticket[]
  onTicketClick: (ticket: Ticket) => void
  onAddTicket: (status: string) => void
}

export function KanbanColumn({ status, tickets, onTicketClick, onAddTicket }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <TicketStatusBadge status={status} />
          <span className="text-xs text-slate-400 font-medium">{tickets.length}</span>
        </div>
        <button
          onClick={() => onAddTicket(status)}
          className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 min-h-24 rounded-xl p-2 transition-colors ${
          isOver ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-slate-100/50'
        }`}
      >
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tickets.map(ticket => (
              <SortableTicketCard key={ticket.id} ticket={ticket} onClick={onTicketClick} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

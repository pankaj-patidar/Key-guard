import React from 'react'
import { Ticket } from '../../store/boardStore'
import { TicketTypeIcon } from './TicketTypeIcon'
import { TicketPriorityBadge } from './TicketPriorityBadge'

const PRIORITY_STRIP: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-blue-500',
  low:      'bg-zinc-600',
}

interface Props {
  ticket: Ticket
  onClick: (ticket: Ticket) => void
}

export function TicketCard({ ticket, onClick }: Props) {
  return (
    <div
      onClick={() => onClick(ticket)}
      className="relative bg-white border border-slate-200 rounded-xl p-3 cursor-pointer hover:border-slate-400 hover:shadow-lg hover:shadow-black/20 transition-all group overflow-hidden"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${PRIORITY_STRIP[ticket.priority] ?? 'bg-zinc-600'}`} />

      <div className="pl-2">
        <div className="flex items-center gap-2 mb-2">
          <TicketTypeIcon type={ticket.type} size="sm" />
          <span className="text-xs text-slate-400 font-mono">
            {ticket.project_id.slice(0, 4).toUpperCase()}-{ticket.ticket_number}
          </span>
          <div className="ml-auto">
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
        </div>

        <p className="text-sm font-medium text-slate-900 leading-snug line-clamp-2 mb-3 group-hover:text-slate-900 transition-colors">
          {ticket.title}
        </p>

        {ticket.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {ticket.labels.slice(0, 3).map(l => (
              <span
                key={l.id}
                className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${l.color}20`, color: l.color }}
              >
                {l.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {ticket.story_points != null && (
              <span className="bg-slate-50 px-1.5 py-0.5 rounded font-mono text-xs text-slate-500">
                {ticket.story_points}
              </span>
            )}
          </div>

          {ticket.assignee && (
            <div
              className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
              title={ticket.assignee.full_name}
            >
              {ticket.assignee.full_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

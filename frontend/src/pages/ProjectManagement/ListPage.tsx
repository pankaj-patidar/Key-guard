import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LayoutGrid, List, Plus } from 'lucide-react'
import { useTickets } from '../../hooks/useTickets'
import { TicketTypeIcon } from '../../components/tickets/TicketTypeIcon'
import { TicketStatusBadge } from '../../components/tickets/TicketStatusBadge'
import { TicketPriorityBadge } from '../../components/tickets/TicketPriorityBadge'
import { TicketDetailDrawer } from '../../components/tickets/TicketDetailDrawer'
import { TicketForm } from '../../components/tickets/TicketForm'

export function ListPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { data: tickets = [], isLoading } = useTickets(projectId!)
  const [selected, setSelected] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          <Link to={`/projects/${projectId}/board`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-900 rounded-md text-sm transition-colors">
            <LayoutGrid className="w-4 h-4" /> Board
          </Link>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-md text-slate-700 text-sm font-medium">
            <List className="w-4 h-4" /> List
          </button>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Ticket
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-24">ID</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Title</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-36">Status</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-24">Priority</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-36">Assignee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {tickets.map(ticket => (
              <tr key={ticket.id} onClick={() => setSelected(ticket.ticket_number)}
                className="hover:bg-slate-500 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TicketTypeIcon type={ticket.type} size="sm" />
                    <span className="text-xs font-mono text-slate-400">#{ticket.ticket_number}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-800 font-medium">{ticket.title}</span>
                </td>
                <td className="px-4 py-3"><TicketStatusBadge status={ticket.status} /></td>
                <td className="px-4 py-3"><TicketPriorityBadge priority={ticket.priority} showLabel /></td>
                <td className="px-4 py-3 text-sm text-slate-500">{ticket.assignee?.full_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && tickets.length === 0 && (
          <div className="text-center py-20 text-slate-500 text-sm">No tickets yet</div>
        )}
      </div>

      {showForm && <TicketForm projectId={projectId!} onClose={() => setShowForm(false)} />}
      <TicketDetailDrawer projectId={projectId!} ticketNumber={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

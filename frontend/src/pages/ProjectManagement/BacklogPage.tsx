import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Layers, Plus } from 'lucide-react'
import { api } from '../../lib/api'
import { Ticket } from '../../store/boardStore'
import { TicketTypeIcon } from '../../components/tickets/TicketTypeIcon'
import { TicketPriorityBadge } from '../../components/tickets/TicketPriorityBadge'
import { TicketDetailDrawer } from '../../components/tickets/TicketDetailDrawer'
import { TicketForm } from '../../components/tickets/TicketForm'

export function BacklogPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [selected, setSelected] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: tickets = [] } = useQuery({
    queryKey: ['projects', projectId, 'backlog'],
    queryFn: () => api.get<Ticket[]>(`/projects/${projectId}/backlog`).then(r => r.data),
  })

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Backlog</h1>
            <p className="text-slate-500 text-sm mt-0.5">Tickets not assigned to any sprint</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add to Backlog
        </button>
      </div>

      <div className="space-y-2">
        {tickets.map(t => (
          <div key={t.id} onClick={() => setSelected(t.ticket_number)}
            className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-400 cursor-pointer transition-all">
            <TicketTypeIcon type={t.type} />
            <span className="text-xs font-mono text-slate-400">#{t.ticket_number}</span>
            <span className="flex-1 text-sm font-medium text-slate-800">{t.title}</span>
            <TicketPriorityBadge priority={t.priority} showLabel />
            {t.story_points != null && (
              <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{t.story_points}</span>
            )}
            <span className="text-xs text-slate-400">{t.assignee?.full_name ?? 'Unassigned'}</span>
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="text-center py-20 text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl">
            Backlog is empty
          </div>
        )}
      </div>

      {showForm && <TicketForm projectId={projectId!} defaultStatus="backlog" onClose={() => setShowForm(false)} />}
      <TicketDetailDrawer projectId={projectId!} ticketNumber={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

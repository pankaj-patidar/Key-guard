import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ParkingCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { Ticket } from '../../store/boardStore'
import { TicketTypeIcon } from '../../components/tickets/TicketTypeIcon'
import { TicketStatusBadge } from '../../components/tickets/TicketStatusBadge'
import { TicketDetailDrawer } from '../../components/tickets/TicketDetailDrawer'

export function ParkingLotPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [selected, setSelected] = useState<number | null>(null)

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['projects', projectId, 'parking-lot'],
    queryFn: () => api.get<Ticket[]>(`/projects/${projectId}/parking-lot`).then(r => r.data),
  })

  const onHold = tickets.filter(t => t.status === 'on_hold')
  const waiting = tickets.filter(t => t.status === 'waiting_for_client')

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <ParkingCircle className="w-6 h-6 text-amber-400" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Parking Lot</h1>
          <p className="text-slate-500 text-sm mt-0.5">Blocked tickets and items waiting for client input</p>
        </div>
        <span className="ml-auto text-xs text-slate-400">{tickets.length} total</span>
      </div>

      {[
        { label: 'On Hold', items: onHold, color: 'text-amber-400', border: 'border-amber-500/20' },
        { label: 'Waiting for Client', items: waiting, color: 'text-orange-400', border: 'border-orange-500/20' },
      ].map(({ label, items, color, border }) => (
        <section key={label} className="mb-8">
          <h2 className={`text-sm font-semibold ${color} mb-3 flex items-center gap-2`}>
            {label}
            <span className="text-slate-400 font-normal">({items.length})</span>
          </h2>
          {items.length === 0 ? (
            <p className={`text-slate-500 text-sm py-6 text-center border border-dashed ${border} rounded-xl`}>None</p>
          ) : (
            <div className="space-y-2">
              {items.map(t => (
                <div key={t.id} onClick={() => setSelected(t.ticket_number)}
                  className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-400 cursor-pointer transition-all">
                  <TicketTypeIcon type={t.type} />
                  <span className="text-xs font-mono text-slate-400">#{t.ticket_number}</span>
                  <span className="flex-1 text-sm font-medium text-slate-800">{t.title}</span>
                  <TicketStatusBadge status={t.status} />
                  <span className="text-xs text-slate-400">{t.assignee?.full_name ?? 'Unassigned'}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      <TicketDetailDrawer projectId={projectId!} ticketNumber={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

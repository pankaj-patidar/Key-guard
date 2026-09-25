import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LayoutGrid, List } from 'lucide-react'
import { useBoard } from '../../hooks/useBoard'
import { KanbanBoard } from '../../components/board/KanbanBoard'
import { TicketForm } from '../../components/tickets/TicketForm'
import { TicketDetailDrawer } from '../../components/tickets/TicketDetailDrawer'
import { Ticket } from '../../store/boardStore'

export function BoardPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null)
  const [addingToStatus, setAddingToStatus] = useState<string | null>(null)
  const { isLoading } = useBoard(projectId!)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-md text-slate-700 text-sm font-medium">
            <LayoutGrid className="w-4 h-4" /> Board
          </button>
          <Link to={`/projects/${projectId}/list`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-900 rounded-md text-sm transition-colors">
            <List className="w-4 h-4" /> List
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <KanbanBoard
          projectId={projectId!}
          onTicketClick={(t: Ticket) => setSelectedTicket(t.ticket_number)}
          onAddTicket={(status) => setAddingToStatus(status)}
        />
      </div>

      {addingToStatus && (
        <TicketForm
          projectId={projectId!}
          defaultStatus={addingToStatus}
          onClose={() => setAddingToStatus(null)}
        />
      )}

      <TicketDetailDrawer
        projectId={projectId!}
        ticketNumber={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  )
}

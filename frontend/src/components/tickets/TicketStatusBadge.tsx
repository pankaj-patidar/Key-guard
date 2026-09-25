import React from 'react'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  backlog:            { label: 'Backlog',        className: 'bg-slate-100 text-slate-700' },
  todo:               { label: 'Todo',           className: 'bg-slate-700 text-slate-200' },
  in_progress:        { label: 'In Progress',    className: 'bg-blue-500/20 text-blue-300' },
  in_review:          { label: 'In Review',      className: 'bg-purple-500/20 text-purple-300' },
  on_hold:            { label: 'On Hold',        className: 'bg-amber-500/20 text-amber-300' },
  waiting_for_client: { label: 'Waiting Client', className: 'bg-orange-500/20 text-orange-300' },
  done:               { label: 'Done',           className: 'bg-green-500/20 text-green-300' },
  cancelled:          { label: 'Cancelled',      className: 'bg-zinc-600 text-slate-500 line-through' },
}

export function TicketStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-700' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink } from 'lucide-react'
import { useTicket, useUpdateTicket } from '../../hooks/useTickets'
import { TicketTypeIcon } from './TicketTypeIcon'
import { TicketStatusBadge } from './TicketStatusBadge'
import { TicketPriorityBadge } from './TicketPriorityBadge'
import { SprintSelector } from '../sprints/SprintSelector'
import { EpicSelector } from '../epics/EpicSelector'
import { RichTextEditor } from '../editor/RichTextEditor'
import { RichTextViewer } from '../editor/RichTextViewer'
import { CommentThread } from '../comments/CommentThread'
import { AttachmentList } from '../attachments/AttachmentList'

interface Props {
  projectId: string
  ticketNumber: number | null
  onClose: () => void
}

const ALL_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'on_hold', 'waiting_for_client', 'done', 'cancelled']

export function TicketDetailDrawer({ projectId, ticketNumber, onClose }: Props) {
  const { data: ticket } = useTicket(projectId, ticketNumber ?? 0)
  const updateTicket = useUpdateTicket(projectId, ticketNumber ?? 0)
  const [isEditingDesc, setIsEditingDesc] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    if (!ticketNumber) return
    await updateTicket.mutateAsync({ status: newStatus as any })
  }

  return (
    <AnimatePresence>
      {ticketNumber != null && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-slate-100 border-l border-slate-200 z-50 flex flex-col overflow-hidden"
          >
            {ticket ? (
              <>
                <div className="flex items-center justify-between p-5 border-b border-slate-200 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <TicketTypeIcon type={ticket.type} />
                    <span className="text-sm font-mono text-slate-500">
                      #{ticket.ticket_number}
                    </span>
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <h1 className="text-xl font-bold text-slate-900">{ticket.title}</h1>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400 mb-1.5 text-xs uppercase tracking-wider">Priority</p>
                      <TicketPriorityBadge priority={ticket.priority} showLabel />
                    </div>
                    <div>
                      <p className="text-slate-400 mb-1.5 text-xs uppercase tracking-wider">Status</p>
                      <select
                        value={ticket.status}
                        onChange={e => handleStatusChange(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        {ALL_STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-1.5 text-xs uppercase tracking-wider">Assignee</p>
                      <p className="text-slate-800">{ticket.assignee?.full_name ?? 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-1.5 text-xs uppercase tracking-wider">Reporter</p>
                      <p className="text-slate-800">{ticket.reporter?.full_name ?? '—'}</p>
                    </div>
                    {ticket.story_points != null && (
                      <div>
                        <p className="text-slate-400 mb-1.5 text-xs uppercase tracking-wider">Story Points</p>
                        <p className="text-slate-800 font-mono">{ticket.story_points}</p>
                      </div>
                    )}
                    {ticket.due_date && (
                      <div>
                        <p className="text-slate-400 mb-1.5 text-xs uppercase tracking-wider">Due Date</p>
                        <p className="text-slate-800">{ticket.due_date}</p>
                      </div>
                    )}
                    <SprintSelector
                      projectId={projectId}
                      value={ticket.sprint_id}
                      onChange={sprintId => updateTicket.mutate({ sprint_id: sprintId })}
                    />
                    <EpicSelector
                      projectId={projectId}
                      value={ticket.epic_id}
                      onChange={epicId => updateTicket.mutate({ epic_id: epicId })}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-slate-400 mb-2 text-xs uppercase tracking-wider">Description</p>
                    {isEditingDesc ? (
                      <div onBlur={() => setIsEditingDesc(false)}>
                        <RichTextEditor
                          content={ticket.description as Record<string, unknown> | null}
                          onChange={content => updateTicket.mutate({ description: content as any })}
                          placeholder="Add a description…"
                        />
                      </div>
                    ) : (
                      <div
                        className="min-h-16 cursor-pointer hover:bg-white rounded-xl p-3 -mx-3 transition-colors"
                        onClick={() => setIsEditingDesc(true)}
                      >
                        <RichTextViewer content={ticket.description as Record<string, unknown> | null} />
                      </div>
                    )}
                  </div>

                  {/* Labels */}
                  {ticket.labels.length > 0 && (
                    <div>
                      <p className="text-slate-400 mb-2 text-xs uppercase tracking-wider">Labels</p>
                      <div className="flex flex-wrap gap-2">
                        {ticket.labels.map(l => (
                          <span key={l.id} className="text-xs px-2 py-1 rounded-full font-medium"
                            style={{ backgroundColor: `${l.color}20`, color: l.color }}>
                            {l.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <CommentThread projectId={projectId} ticketNumber={ticket.ticket_number} />

                  <AttachmentList projectId={projectId} ticketNumber={ticket.ticket_number} />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

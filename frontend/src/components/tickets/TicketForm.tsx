import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateTicket } from '../../hooks/useTickets'
import toast from 'react-hot-toast'

const TICKET_TYPES = ['bug', 'task', 'todo'] as const
const PRIORITIES   = ['critical', 'high', 'medium', 'low'] as const
const STATUSES     = ['backlog', 'todo', 'in_progress', 'in_review', 'done'] as const

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug', task: 'Task', todo: 'To Do',
}
const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
}
const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress',
  in_review: 'In Review', done: 'Done',
}

interface Props {
  projectId: string
  defaultStatus?: string
  onClose: () => void
}

export function TicketForm({ projectId, defaultStatus = 'backlog', onClose }: Props) {
  const [title, setTitle]       = useState('')
  const [type, setType]         = useState<string>('task')
  const [priority, setPriority] = useState<string>('medium')
  const [status, setStatus]     = useState(defaultStatus)

  const create = useCreateTicket(projectId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await create.mutateAsync({ title: title.trim(), type, priority, status })
      toast.success('Ticket created')
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Failed to create ticket'
      toast.error(typeof msg === 'string' ? msg : 'Failed to create ticket')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">New Ticket</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ticket title…"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500">
                {TICKET_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500">
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500">
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!title.trim() || create.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {create.isPending ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

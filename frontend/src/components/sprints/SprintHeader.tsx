import React from 'react'
import { differenceInDays, format, parseISO } from 'date-fns'
import { Play, Square, Calendar } from 'lucide-react'
import { Sprint, useActivateSprint, useCloseSprint } from '../../hooks/useSprints'
import toast from 'react-hot-toast'

interface Props {
  sprint: Sprint
  projectId: string
  doneCount: number
  totalCount: number
}

export function SprintHeader({ sprint, projectId, doneCount, totalCount }: Props) {
  const activate = useActivateSprint(projectId)
  const close = useCloseSprint(projectId)

  const daysLeft = sprint.end_date
    ? differenceInDays(parseISO(sprint.end_date), new Date())
    : null

  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const handleActivate = async () => {
    try {
      await activate.mutateAsync(sprint.id)
      toast.success('Sprint activated')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Failed to activate sprint')
    }
  }

  const handleClose = async () => {
    if (!confirm('Close sprint? Incomplete tickets will return to the backlog.')) return
    try {
      await close.mutateAsync(sprint.id)
      toast.success('Sprint closed')
    } catch {
      toast.error('Failed to close sprint')
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            {sprint.title}
            {sprint.is_active && (
              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full font-normal">Active</span>
            )}
          </h2>
          {sprint.goal && <p className="text-sm text-slate-500 mt-0.5">{sprint.goal}</p>}
        </div>

        <div className="flex items-center gap-2">
          {sprint.end_date && (
            <span className={`text-xs flex items-center gap-1 ${daysLeft != null && daysLeft < 3 ? 'text-red-400' : 'text-slate-500'}`}>
              <Calendar className="w-3.5 h-3.5" />
              {daysLeft != null
                ? daysLeft > 0
                  ? `${daysLeft}d left`
                  : 'Overdue'
                : format(parseISO(sprint.end_date), 'MMM d')}
            </span>
          )}
          {!sprint.is_active ? (
            <button
              onClick={handleActivate}
              disabled={activate.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Play className="w-3.5 h-3.5" /> Activate
            </button>
          ) : (
            <button
              onClick={handleClose}
              disabled={close.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
            >
              <Square className="w-3.5 h-3.5" /> Close Sprint
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>{doneCount}/{totalCount} done</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct === 100
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #6366f1, #818cf8)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

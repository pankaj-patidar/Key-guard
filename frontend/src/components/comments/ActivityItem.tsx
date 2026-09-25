import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ActivityEntry } from '../../hooks/useActivity'

const ACTION_LABELS: Record<string, (entry: ActivityEntry) => string> = {
  status_changed:    e => `changed status from ${e.old_value?.status} → ${e.new_value?.status}`,
  assignee_changed:  () => `changed assignee`,
  priority_changed:  e => `changed priority from ${e.old_value?.priority} → ${e.new_value?.priority}`,
  sprint_id_changed: () => `updated sprint`,
  epic_id_changed:   () => `updated epic`,
}

function describeAction(entry: ActivityEntry): string {
  const fn = ACTION_LABELS[entry.action]
  return fn ? fn(entry) : entry.action.replace(/_/g, ' ')
}

export function ActivityItem({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-700 flex-shrink-0 mt-0.5">
        {entry.actor.full_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-slate-700">{entry.actor.full_name}</span>
        {' '}
        <span className="text-slate-400">{describeAction(entry)}</span>
        <span className="text-slate-500 text-xs ml-2">
          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}

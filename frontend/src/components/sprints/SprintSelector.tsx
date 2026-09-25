import React from 'react'
import { Calendar } from 'lucide-react'
import { useSprints } from '../../hooks/useSprints'

interface Props {
  projectId: string
  value: string | null
  onChange: (sprintId: string | null) => void
}

export function SprintSelector({ projectId, value, onChange }: Props) {
  const { data: sprints = [] } = useSprints(projectId)

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
        <Calendar className="w-3 h-3" /> Sprint
      </label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors border-slate-200"
      >
        <option value="">No sprint</option>
        {sprints.map(s => (
          <option key={s.id} value={s.id}>
            {s.title}{s.is_active ? ' (Active)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

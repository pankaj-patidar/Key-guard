import React from 'react'
import { Zap } from 'lucide-react'
import { useEpics } from '../../hooks/useEpics'

interface Props {
  projectId: string
  value: string | null
  onChange: (epicId: string | null) => void
}

export function EpicSelector({ projectId, value, onChange }: Props) {
  const { data: epics = [] } = useEpics(projectId)

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
        <Zap className="w-3 h-3 text-purple-400" /> Epic
      </label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
      >
        <option value="">No epic</option>
        {epics.map(e => (
          <option key={e.id} value={e.id}>{e.title}</option>
        ))}
      </select>
    </div>
  )
}

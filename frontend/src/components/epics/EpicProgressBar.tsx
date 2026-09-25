import React from 'react'

interface Props {
  done: number
  total: number
  color?: string
}

export function EpicProgressBar({ done, total, color = '#6366f1' }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{done}/{total} tickets done</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

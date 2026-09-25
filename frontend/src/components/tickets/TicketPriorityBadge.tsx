import React from 'react'
import { AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react'

const PRIORITY_CONFIG = {
  critical: { icon: AlertCircle, color: 'text-red-400',    label: 'Critical' },
  high:     { icon: ArrowUp,     color: 'text-orange-400', label: 'High'     },
  medium:   { icon: Minus,       color: 'text-blue-400',   label: 'Medium'   },
  low:      { icon: ArrowDown,   color: 'text-slate-500',   label: 'Low'      },
} as const

interface Props { priority: string; showLabel?: boolean }

export function TicketPriorityBadge({ priority, showLabel = false }: Props) {
  const cfg = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium
  const { icon: Icon, color, label } = cfg
  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {showLabel && <span className="text-xs">{label}</span>}
    </span>
  )
}

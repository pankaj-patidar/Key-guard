import React from 'react'
import { Zap, Calendar, Bug, CheckSquare, Circle } from 'lucide-react'

const CONFIG = {
  epic:   { icon: Zap,         color: 'text-purple-400', bg: 'bg-purple-400/10' },
  sprint: { icon: Calendar,    color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  bug:    { icon: Bug,         color: 'text-red-400',    bg: 'bg-red-400/10'    },
  task:   { icon: CheckSquare, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  todo:   { icon: Circle,      color: 'text-green-400',  bg: 'bg-green-400/10'  },
} as const

interface Props {
  type: string
  size?: 'sm' | 'md'
}

export function TicketTypeIcon({ type, size = 'md' }: Props) {
  const cfg = CONFIG[type as keyof typeof CONFIG] ?? CONFIG.task
  const { icon: Icon, color, bg } = cfg
  const sz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const pad = size === 'sm' ? 'p-1' : 'p-1.5'
  return (
    <span className={`inline-flex items-center justify-center rounded ${bg} ${pad}`}>
      <Icon className={`${sz} ${color}`} />
    </span>
  )
}

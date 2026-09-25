import React, { useState } from 'react'
import { X } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { useCreateSprint } from '../../hooks/useSprints'
import toast from 'react-hot-toast'

interface Props {
  projectId: string
  onClose: () => void
}

export function SprintForm({ projectId, onClose }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const twoWeeks = format(addDays(new Date(), 14), 'yyyy-MM-dd')

  const [title, setTitle] = useState('')
  const [startDate, setStart] = useState(today)
  const [endDate, setEnd] = useState(twoWeeks)
  const [goal, setGoal] = useState('')

  const create = useCreateSprint(projectId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await create.mutateAsync({
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        goal: goal || undefined,
      })
      toast.success('Sprint created')
      onClose()
    } catch {
      toast.error('Failed to create sprint')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">New Sprint</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Sprint name"
            required
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStart(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEnd(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <input
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="Sprint goal (optional)"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || create.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              {create.isPending ? 'Creating…' : 'Create Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

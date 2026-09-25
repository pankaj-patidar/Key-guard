import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Zap, Plus } from 'lucide-react'
import { useEpics } from '../../hooks/useEpics'
import { EpicProgressBar } from '../../components/epics/EpicProgressBar'
import { EpicForm } from '../../components/epics/EpicForm'

export function EpicsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { data: epics = [], isLoading } = useEpics(projectId!)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-purple-400" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Epics</h1>
            <p className="text-slate-500 text-sm mt-0.5">High-level themes grouping related tickets</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Epic
        </button>
      </div>

      <div className="space-y-3">
        {epics.map(epic => (
          <div key={epic.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">{epic.title}</p>
                  <p className="text-xs font-mono text-slate-400">#{epic.ticket_number}</p>
                </div>
              </div>
            </div>
            <EpicProgressBar done={epic.done_tickets} total={epic.total_tickets} color="#8b5cf6" />
          </div>
        ))}
        {!isLoading && epics.length === 0 && (
          <div className="text-center py-20 text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl">
            No epics yet — create one to group related tickets
          </div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showForm && <EpicForm projectId={projectId!} onClose={() => setShowForm(false)} />}
    </div>
  )
}

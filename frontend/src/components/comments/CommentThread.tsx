import React, { useState } from 'react'
import { useComments, useCreateComment } from '../../hooks/useComments'
import { useActivity } from '../../hooks/useActivity'
import { CommentItem } from './CommentItem'
import { ActivityItem } from './ActivityItem'
import { RichTextEditor } from '../editor/RichTextEditor'
import toast from 'react-hot-toast'

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

interface Props {
  projectId: string
  ticketNumber: number
}

export function CommentThread({ projectId, ticketNumber }: Props) {
  const { data: comments = [] } = useComments(projectId, ticketNumber)
  const { data: activity = [] } = useActivity(projectId, ticketNumber)
  const createComment = useCreateComment(projectId, ticketNumber)
  const [draft, setDraft] = useState<Record<string, unknown>>(EMPTY_DOC)
  const [isFocused, setIsFocused] = useState(false)

  const timeline = [
    ...comments.map(c => ({ type: 'comment' as const, created_at: c.created_at, data: c })),
    ...activity.map(a => ({ type: 'activity' as const, created_at: a.created_at, data: a })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createComment.mutateAsync({ content: draft })
      setDraft(EMPTY_DOC)
      setIsFocused(false)
      toast.success('Comment added')
    } catch {
      toast.error('Failed to post comment')
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Activity</h3>

      <div className="space-y-4">
        {timeline.map(item =>
          item.type === 'comment' ? (
            <CommentItem key={item.data.id} comment={item.data as any} projectId={projectId} ticketNumber={ticketNumber} />
          ) : (
            <ActivityItem key={item.data.id} entry={item.data as any} />
          )
        )}
        {timeline.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">No activity yet</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <RichTextEditor
          content={draft}
          onChange={setDraft}
          placeholder="Add a comment…"
          minHeight="80px"
        />
        {isFocused && (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setIsFocused(false); setDraft(EMPTY_DOC) }}
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createComment.isPending}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {createComment.isPending ? 'Posting…' : 'Comment'}
            </button>
          </div>
        )}
        {!isFocused && (
          <button
            type="button"
            onClick={() => setIsFocused(true)}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            Click to add a comment…
          </button>
        )}
      </form>
    </div>
  )
}

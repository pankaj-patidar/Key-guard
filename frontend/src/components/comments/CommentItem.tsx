import React from 'react'
import { Trash2, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Comment, useDeleteComment } from '../../hooks/useComments'
import { RichTextViewer } from '../editor/RichTextViewer'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

interface Props {
  comment: Comment
  projectId: string
  ticketNumber: number
}

export function CommentItem({ comment, projectId, ticketNumber }: Props) {
  const currentUser = useAuthStore(s => s.user)
  const deleteComment = useDeleteComment(projectId, ticketNumber)
  const isOwn = currentUser?.id === comment.author.id

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return
    try {
      await deleteComment.mutateAsync(comment.id)
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="flex items-start gap-3 group">
      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
        {comment.author.full_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-semibold text-slate-800">{comment.author.full_name}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {comment.is_edited && <span className="text-xs text-slate-500">(edited)</span>}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <RichTextViewer content={comment.content} />
        </div>
        {isOwn && (
          <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleDelete}
              className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

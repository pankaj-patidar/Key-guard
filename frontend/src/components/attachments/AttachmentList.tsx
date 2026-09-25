import React from 'react'
import { File, Trash2, Download } from 'lucide-react'
import { useAttachments, useDeleteAttachment, formatBytes } from '../../hooks/useAttachments'
import { AttachmentUpload } from './AttachmentUpload'
import toast from 'react-hot-toast'

interface Props {
  projectId: string
  ticketNumber: number
}

export function AttachmentList({ projectId, ticketNumber }: Props) {
  const { data: attachments = [] } = useAttachments(projectId, ticketNumber)
  const del = useDeleteAttachment(projectId, ticketNumber)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await del.mutateAsync(id)
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
        Attachments{attachments.length > 0 && ` (${attachments.length})`}
      </h3>
      {attachments.map(a => (
        <div key={a.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg group">
          <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-800 truncate">{a.filename}</p>
            <p className="text-xs text-slate-400">{formatBytes(a.file_size)} · {a.mime_type}</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={`/api/v1/attachments/${a.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => handleDelete(a.id, a.filename)}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      <AttachmentUpload projectId={projectId} ticketNumber={ticketNumber} />
    </div>
  )
}

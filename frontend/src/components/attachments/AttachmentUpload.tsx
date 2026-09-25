import React, { useRef } from 'react'
import { Upload } from 'lucide-react'
import { useUploadAttachment } from '../../hooks/useAttachments'
import toast from 'react-hot-toast'

interface Props {
  projectId: string
  ticketNumber: number
}

export function AttachmentUpload({ projectId, ticketNumber }: Props) {
  const upload = useUploadAttachment(projectId, ticketNumber)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync(file)
        toast.success(`${file.name} uploaded`)
      } catch (e: any) {
        toast.error(e.response?.data?.detail ?? `Failed to upload ${file.name}`)
      }
    }
  }

  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
      className="border border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-all"
    >
      <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
      <p className="text-xs text-slate-400">
        {upload.isPending ? 'Uploading…' : 'Drop files or click to upload'}
      </p>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
    </div>
  )
}

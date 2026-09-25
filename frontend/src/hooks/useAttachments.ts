import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface Attachment {
  id: string
  ticket_id: string
  filename: string
  file_size: number
  mime_type: string
  created_at: string
}

const key = (projectId: string, ticketNumber: number) =>
  ['projects', projectId, 'tickets', ticketNumber, 'attachments']

export function useAttachments(projectId: string, ticketNumber: number) {
  return useQuery({
    queryKey: key(projectId, ticketNumber),
    queryFn: () =>
      api.get<Attachment[]>(`/projects/${projectId}/tickets/${ticketNumber}/attachments`).then(r => r.data),
    enabled: !!ticketNumber,
  })
}

export function useUploadAttachment(projectId: string, ticketNumber: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<Attachment>(
        `/projects/${projectId}/tickets/${ticketNumber}/attachments`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      ).then(r => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId, ticketNumber) }),
  })
}

export function useDeleteAttachment(projectId: string, ticketNumber: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) => api.delete(`/attachments/${attachmentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId, ticketNumber) }),
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

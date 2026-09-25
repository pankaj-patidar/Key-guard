import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateRole, usePermissionKeys } from '../../hooks/useRoles'
import { PermissionMatrix } from './PermissionMatrix'
import toast from 'react-hot-toast'

const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

interface Props {
  onClose: () => void
}

export function RoleForm({ onClose }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [description, setDescription] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  const { data: allPermissions = [] } = usePermissionKeys()
  const createRole = useCreateRole()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await createRole.mutateAsync({
        name: name.trim(),
        color,
        description: description.trim() || undefined,
        permission_keys: Array.from(selectedKeys),
      })
      toast.success('Role created')
      onClose()
    } catch {
      toast.error('Failed to create role')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Create Role</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5 border-b border-slate-200">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. QA Lead"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Color</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-lg transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does this role do?"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Permissions</h3>
            <PermissionMatrix
              allPermissions={allPermissions}
              selectedKeys={selectedKeys}
              onChange={setSelectedKeys}
            />
          </div>
        </form>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={!name.trim() || createRole.isPending}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {createRole.isPending ? 'Creating…' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  )
}

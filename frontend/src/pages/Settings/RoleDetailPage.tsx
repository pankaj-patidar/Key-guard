import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Lock } from 'lucide-react'
import { useRole, usePermissionKeys, useUpdateRolePermissions, useDeleteRole } from '../../hooks/useRoles'
import { PermissionMatrix } from '../../components/roles/PermissionMatrix'
import toast from 'react-hot-toast'

export function RoleDetailPage() {
  const { roleId } = useParams<{ roleId: string }>()
  const navigate = useNavigate()
  const { data: role, isLoading } = useRole(roleId!)
  const { data: allPermissions = [] } = usePermissionKeys()
  const updatePerms = useUpdateRolePermissions(roleId!)
  const deleteRole = useDeleteRole()

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (role) {
      setSelectedKeys(new Set(role.permissions.map(p => p.key)))
      setDirty(false)
    }
  }, [role])

  const handleChange = (keys: Set<string>) => {
    setSelectedKeys(keys)
    setDirty(true)
  }

  const handleSave = async () => {
    try {
      await updatePerms.mutateAsync(Array.from(selectedKeys))
      toast.success('Permissions updated')
      setDirty(false)
    } catch {
      toast.error('Failed to update permissions')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete role "${role?.name}"? This cannot be undone.`)) return
    try {
      await deleteRole.mutateAsync(roleId!)
      toast.success('Role deleted')
      navigate('/settings/roles')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Failed to delete role')
    }
  }

  if (isLoading || !role) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isLocked = role.is_system && role.slug === 'admin'

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate('/settings/roles')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Roles
      </button>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${role.color}20`, border: `1px solid ${role.color}40` }}
          >
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: role.color }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {role.name}
              {role.is_system && <Lock className="w-4 h-4 text-slate-400" />}
            </h1>
            {role.description && <p className="text-slate-500 text-sm mt-0.5">{role.description}</p>}
          </div>
        </div>

        <div className="flex gap-2">
          {!role.is_system && (
            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {!isLocked && dirty && (
            <button
              onClick={handleSave}
              disabled={updatePerms.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {updatePerms.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {isLocked && (
        <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4" /> Admin permissions are locked and cannot be modified.
        </div>
      )}

      <PermissionMatrix
        allPermissions={allPermissions}
        selectedKeys={selectedKeys}
        onChange={handleChange}
        readOnly={isLocked}
      />
    </div>
  )
}

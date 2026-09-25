import React, { useState } from 'react'
import { Plus, Shield } from 'lucide-react'
import { useRoles } from '../../hooks/useRoles'
import { RoleCard } from '../../components/roles/RoleCard'
import { RoleForm } from '../../components/roles/RoleForm'
import { useAuthStore } from '../../store/authStore'

export function RolesPage() {
  const { data: roles = [], isLoading } = useRoles()
  const [showForm, setShowForm] = useState(false)
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'

  const systemRoles = roles.filter(r => r.is_system)
  const customRoles = roles.filter(r => !r.is_system)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-400" />
            Roles & Permissions
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage what each role can do across the system</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Role
          </button>
        )}
      </div>

      {systemRoles.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">System Roles</h2>
          <div className="space-y-2">
            {systemRoles.map(role => <RoleCard key={role.id} role={role} />)}
          </div>
        </section>
      )}

      {customRoles.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Custom Roles</h2>
          <div className="space-y-2">
            {customRoles.map(role => <RoleCard key={role.id} role={role} />)}
          </div>
        </section>
      )}

      {customRoles.length === 0 && systemRoles.length > 0 && !isLoading && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">No custom roles yet. Click "New Role" to create one.</p>
        </div>
      )}

      {showForm && <RoleForm onClose={() => setShowForm(false)} />}
    </div>
  )
}

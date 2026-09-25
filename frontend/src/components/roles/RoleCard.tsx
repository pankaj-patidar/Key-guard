import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Lock, ChevronRight } from 'lucide-react'
import { Role } from '../../hooks/useRoles'

interface Props {
  role: Role
}

export function RoleCard({ role }: Props) {
  return (
    <Link
      to={`/settings/roles/${role.id}`}
      className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-400 transition-all group"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${role.color}20`, border: `1px solid ${role.color}40` }}
      >
        <Shield className="w-5 h-5" style={{ color: role.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 truncate">{role.name}</span>
          {role.is_system && (
            <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> System
            </span>
          )}
        </div>
        {role.description && (
          <p className="text-sm text-slate-400 truncate mt-0.5">{role.description}</p>
        )}
        <p className="text-xs text-slate-500 mt-1">{role.permissions.length} permissions</p>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-500 transition-colors" />
    </Link>
  )
}

import React from 'react'
import { Permission } from '../../hooks/useRoles'

const MODULE_LABELS: Record<string, string> = {
  projects: 'Projects',
  tickets: 'Tickets',
  sprints: 'Sprints',
  epics: 'Epics',
  roles: 'Roles & Permissions',
  attachments: 'Attachments',
  notifications: 'Notifications',
}

const MODULES = Object.keys(MODULE_LABELS)

interface Props {
  allPermissions: Permission[]
  selectedKeys: Set<string>
  onChange?: (keys: Set<string>) => void
  readOnly?: boolean
}

export function PermissionMatrix({ allPermissions, selectedKeys, onChange, readOnly = false }: Props) {
  const byModule = MODULES.reduce<Record<string, Permission[]>>((acc, mod) => {
    acc[mod] = allPermissions.filter(p => p.module === mod)
    return acc
  }, {})

  const toggle = (key: string) => {
    if (readOnly || !onChange) return
    const next = new Set(selectedKeys)
    next.has(key) ? next.delete(key) : next.add(key)
    onChange(next)
  }

  const toggleModule = (mod: string) => {
    if (readOnly || !onChange) return
    const moduleKeys = byModule[mod].map(p => p.key)
    const allSelected = moduleKeys.every(k => selectedKeys.has(k))
    const next = new Set(selectedKeys)
    moduleKeys.forEach(k => allSelected ? next.delete(k) : next.add(k))
    onChange(next)
  }

  return (
    <div className="space-y-8">
      {MODULES.map(mod => {
        const perms = byModule[mod]
        if (!perms?.length) return null
        const allSelected = perms.every(p => selectedKeys.has(p.key))
        const someSelected = perms.some(p => selectedKeys.has(p.key))

        return (
          <div key={mod}>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                onChange={() => toggleModule(mod)}
                disabled={readOnly}
                className="w-4 h-4 accent-indigo-500 cursor-pointer"
              />
              <h4 className="text-sm font-semibold text-slate-800">{MODULE_LABELS[mod]}</h4>
              <span className="text-xs text-slate-400 ml-auto">
                {perms.filter(p => selectedKeys.has(p.key)).length}/{perms.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-7">
              {perms.map(perm => (
                <label
                  key={perm.key}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                    readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(perm.key)}
                    onChange={() => toggle(perm.key)}
                    disabled={readOnly}
                    className="mt-0.5 w-4 h-4 accent-indigo-500"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-slate-700 truncate">{perm.key}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{perm.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

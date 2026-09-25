import React from 'react'
import { SystemSetting } from '../../../hooks/useSystemSettings'

interface Props {
  setting: SystemSetting
  value: string
  onChange: (key: string, value: string) => void
}

export function SettingField({ setting, value, onChange }: Props) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-slate-100 last:border-0">
      <div className="flex-1">
        <label className="block text-sm font-medium text-slate-800 mb-0.5">{setting.label}</label>
        {setting.description && <p className="text-xs text-slate-400">{setting.description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {setting.value_type === 'boolean' ? (
          <button
            type="button"
            onClick={() => onChange(setting.key, value === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              value === 'true' ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              value === 'true' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        ) : (
          <input
            type={setting.value_type === 'integer' ? 'number' : 'text'}
            value={value}
            onChange={e => onChange(setting.key, e.target.value)}
            className="w-64 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800
                       focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        )}
      </div>
    </div>
  )
}

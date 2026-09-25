import React, { useState, useEffect } from 'react'
import { Settings, Save, Loader2 } from 'lucide-react'
import { useSystemSettings, useUpdateSetting } from '../../hooks/useSystemSettings'
import { SettingField } from './tabs/SettingField'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'general',       label: 'General'       },
  { id: 'tickets',       label: 'Tickets'       },
  { id: 'sprints',       label: 'Sprints'       },
  { id: 'uploads',       label: 'Uploads'       },
  { id: 'notifications', label: 'Notifications' },
  { id: 'access',        label: 'Access Control'},
] as const

export function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('general')
  const [localValues, setLocalValues] = useState<Record<string, string>>({})

  const { data: settings = [], isLoading } = useSystemSettings(activeTab)
  const updateSetting = useUpdateSetting()

  // Sync local values when settings load or tab changes
  useEffect(() => {
    const initial: Record<string, string> = {}
    settings.forEach(s => { initial[s.key] = s.value })
    setLocalValues(initial)
  }, [settings])

  const isDirty = settings.some(s => localValues[s.key] !== s.value)

  const handleSave = async () => {
    const dirty = settings.filter(s => localValues[s.key] !== undefined && localValues[s.key] !== s.value)
    if (dirty.length === 0) return
    try {
      await Promise.all(dirty.map(s => updateSetting.mutateAsync({ key: s.key, value: localValues[s.key] })))
      toast.success('Settings saved')
    } catch {
      // individual errors handled by useUpdateSetting
    }
  }

  const handleTabSwitch = (tabId: string) => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Switch tabs and discard them?')) return
    }
    setActiveTab(tabId)
    setLocalValues({})
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Settings className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">System Settings</h1>
            <p className="text-slate-500 text-sm mt-0.5">Configure application behaviour without code changes</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!isDirty || updateSetting.isPending}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isDirty
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {updateSetting.isPending
            ? <Loader2 size={15} className="animate-spin" />
            : <Save size={15} />}
          Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabSwitch(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-indigo-700 hover:bg-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings panel */}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading…
          </div>
        ) : settings.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No settings in this section.</p>
        ) : (
          <div className="px-6">
            {settings.map(s => (
              <SettingField
                key={s.key}
                setting={s}
                value={localValues[s.key] ?? s.value}
                onChange={(key, val) => setLocalValues(prev => ({ ...prev, [key]: val }))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dirty indicator */}
      {isDirty && (
        <p className="text-xs text-amber-600 mt-3 text-right">
          You have unsaved changes — click <strong>Save Changes</strong> to apply.
        </p>
      )}
    </div>
  )
}

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, CheckCheck } from 'lucide-react'
import { formatDistanceToNow, isToday } from 'date-fns'
import { useNotifications, useMarkAllRead, Notification } from '../../hooks/useNotifications'
import { useNotificationStore } from '../../store/notificationStore'

const TYPE_COLORS: Record<string, string> = {
  assigned:       'bg-blue-500/20 text-blue-400',
  commented:      'bg-green-500/20 text-green-400',
  status_changed: 'bg-purple-500/20 text-purple-400',
  sprint_ending:  'bg-amber-500/20 text-amber-400',
  sprint_closed:  'bg-zinc-600 text-slate-700',
  mentioned:      'bg-pink-500/20 text-pink-400',
}

function NotificationItem({ notification }: { notification: Notification }) {
  const colorClass = TYPE_COLORS[notification.type] ?? 'bg-slate-100 text-slate-700'
  return (
    <div className={`flex items-start gap-3 px-4 py-3 hover:bg-white transition-colors ${!notification.is_read ? 'bg-slate-500' : ''}`}>
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 flex-shrink-0 ${colorClass}`}>
        {notification.type.replace(/_/g, ' ')}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 leading-snug">{notification.message}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
      )}
    </div>
  )
}

export function NotificationPanel() {
  const { isPanelOpen, closePanel } = useNotificationStore()
  const { data: notifications = [] } = useNotifications()
  const markAll = useMarkAllRead()

  const today = notifications.filter(n => isToday(new Date(n.created_at)))
  const earlier = notifications.filter(n => !isToday(new Date(n.created_at)))

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={closePanel} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed top-14 right-4 w-96 bg-slate-100 border border-slate-200 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-500" />
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => markAll.mutate()}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
                <button onClick={closePanel} className="p-1 text-slate-500 hover:text-slate-900 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[480px]">
              {today.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2">Today</p>
                  {today.map(n => <NotificationItem key={n.id} notification={n} />)}
                </div>
              )}
              {earlier.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2">Earlier</p>
                  {earlier.map(n => <NotificationItem key={n.id} notification={n} />)}
                </div>
              )}
              {notifications.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No notifications</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

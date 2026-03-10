"use client"
import { useAuth } from "@/components/layout/Providers"
import { Avatar } from "@/components/ui/Avatar"
import { Bell } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

interface HeaderProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

type NotifPreview = {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
  jobId?: string | null
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotifPreview[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        const notifs: NotifPreview[] = d.notifications ?? []
        setNotifications(notifs.slice(0, 5))
        setUnreadCount(d.unreadCount ?? notifs.filter((n) => !n.read).length)
      })
      .catch(() => {})
  }, [user])

  function handleClick(n: NotifPreview) {
    setNotifOpen(false)
    // Mark as read
    if (!n.read) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {})
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    // Navigate
    if (n.jobId) {
      router.push(`/jobs/${n.jobId}`)
    } else if (n.title.toLowerCase().includes("issue")) {
      router.push("/issues")
    } else if (n.title.toLowerCase().includes("job") || n.title.toLowerCase().includes("cleaner") || n.title.toLowerCase().includes("assign")) {
      router.push("/jobs")
    } else {
      router.push("/notifications")
    }
  }

  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-20">
      <div>
        {title && <h1 className="text-lg font-semibold text-slate-900">{title}</h1>}
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {actions}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-20">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                  {unreadCount > 0 && <p className="text-xs text-blue-600">{unreadCount} unread</p>}
                </div>
                <div className="divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-slate-400 text-center">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${!n.read ? "bg-blue-50/50" : ""}`}
                      >
                        <p className="text-sm font-medium text-slate-900 truncate">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </button>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-slate-100">
                  <Link
                    href="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center block"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User avatar */}
        {user && (
          <Link href="/settings">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          </Link>
        )}
      </div>
    </header>
  )
}

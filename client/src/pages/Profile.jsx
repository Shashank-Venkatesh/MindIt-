import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui'
import { ProfileNotes } from '../components/ProfileNotes'
import { useAuth } from '../context/useAuth'
import { touchHistoryEntry } from '../lib/history'
import { formatTimestamp } from '../lib/pipeline'

function initialsFor(email) {
  return email.trim().slice(0, 2).toUpperCase()
}

export function Profile() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  function handleOpenEntry(entry) {
    touchHistoryEntry(entry.id, isAuthenticated)
    navigate('/', { state: { historyEntry: entry } })
  }

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="px-4 pb-16 pt-10 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
              {initialsFor(user.email)}
            </span>
            <div>
              <p className="text-base font-semibold text-on-surface">{user.email}</p>
              <p className="text-xs text-on-surface-variant">
                Signed in since {formatTimestamp(user.since)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-white/5 active:scale-95"
          >
            <Icon name="logout" className="text-[16px]" />
            Log out
          </button>
        </section>

        <section>
          <ProfileNotes owner={user.email} isAuthenticated={isAuthenticated} onOpenEntry={handleOpenEntry} />
        </section>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Icon, Panel } from './ui'
import { formatTimestamp } from '../lib/pipeline'
import { getHistory, removeHistoryEntry, clearHistory } from '../lib/history'

export function ProfileNotes({ owner, isAuthenticated = false, onOpenEntry }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const entries = await getHistory(owner, isAuthenticated)
      setHistory(entries)
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load your notes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, isAuthenticated])

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return history
    return history.filter((entry) => (entry.text || '').toLowerCase().includes(trimmed))
  }, [history, query])

  async function handleRemove(id) {
    try {
      await removeHistoryEntry(id, isAuthenticated)
      setHistory((prev) => prev.filter((entry) => entry.id !== id))
    } catch (removeError) {
      setError(removeError.message || 'Failed to delete that note.')
    }
  }

  async function handleClear() {
    try {
      await clearHistory(owner, isAuthenticated)
      setHistory([])
    } catch (clearError) {
      setError(clearError.message || 'Failed to clear your notes.')
    }
  }

  return (
    <Panel
      title="Your notes"
      subtitle={
        loading
          ? 'Loading your saved notes…'
          : history.length
            ? `${history.length} note${history.length === 1 ? '' : 's'} saved to this profile. Search to find one quickly.`
            : "Previous text and file runs you've generated while signed in show up here."
      }
      actions={
        history.length ? (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold text-on-surface-variant transition hover:bg-white/5 hover:text-danger"
          >
            Clear all
          </button>
        ) : null
      }
    >
      {error ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm font-medium text-danger">
          <Icon name="error" className="text-[16px]" />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
          <Icon name="progress_activity" className="animate-spin text-[20px] text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">Loading your notes…</p>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
          <Icon name="history" className="text-[20px] text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">
            Nothing here yet. Generate a summary from the Dashboard and it'll show up in this list.
          </p>
        </div>
      ) : (
        <>
          <div className="relative mb-3">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your notes…"
              className="w-full rounded-lg border border-border bg-surface-alt py-2 pl-9 pr-8 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-on-surface-variant transition hover:text-on-surface"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
              <Icon name="search_off" className="text-[20px] text-on-surface-variant" />
              <p className="text-sm text-on-surface-variant">No notes match “{query}”.</p>
            </div>
          ) : (
            <>
              {query ? (
                <p className="mb-2 text-xs text-on-surface-variant">
                  {filtered.length} match{filtered.length === 1 ? '' : 'es'}
                </p>
              ) : null}
              <ul className="space-y-2">
                {filtered.map((entry) => (
                  <li key={entry.id}>
                    <div className="group flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-surface-alt/60 px-3.5 py-2.5 transition hover:border-on-surface-variant/30">
                      <button
                        type="button"
                        onClick={() => onOpenEntry(entry)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium text-on-surface">{entry.preview || 'Untitled note'}</p>
                        <p className="mt-0.5 text-xs text-on-surface-variant">{formatTimestamp(entry.createdAt)}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(entry.id)}
                        className="shrink-0 rounded-md p-1 text-on-surface-variant opacity-0 transition hover:bg-white/5 hover:text-danger group-hover:opacity-100"
                        aria-label="Delete entry"
                      >
                        <Icon name="delete" className="text-[16px]" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Panel>
  )
}

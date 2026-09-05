// Note history store.
//
// Guests (signed out) keep their runs in localStorage, namespaced by
// GUEST_OWNER, exactly as before — there's no account to attach them to.
// Signed-in users get real persistence via the FastAPI backend's
// /api/notes endpoints (backed by Postgres via Supabase), so their history
// follows them across devices/browsers.

import { apiGet, apiPost, apiDelete } from './api'

const STORAGE_KEY = 'mindit.history.v1'
const MAX_ENTRIES_PER_OWNER = 50
export const GUEST_OWNER = 'guest'

function readRaw() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRaw(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Ignore quota / serialization errors — history is a nice-to-have.
  }
}

function sortByCreatedDesc(entries) {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt)
}

function sortByViewedDesc(entries) {
  return [...entries].sort((a, b) => (b.viewedAt ?? b.createdAt) - (a.viewedAt ?? a.createdAt))
}

export async function getHistory(owner = GUEST_OWNER, isAuthenticated = false) {
  if (isAuthenticated) {
    const notes = await apiGet('/api/notes')
    return sortByCreatedDesc(notes || [])
  }
  return sortByCreatedDesc(readRaw().filter((entry) => entry.owner === owner))
}

export async function getRecentlyViewed(owner = GUEST_OWNER, isAuthenticated = false, limit = 5) {
  const entries = await getHistory(owner, isAuthenticated)
  return sortByViewedDesc(entries).slice(0, limit)
}

export async function touchHistoryEntry(id, isAuthenticated = false) {
  if (isAuthenticated) {
    // GET /api/notes/{id} touches viewedAt server-side as a side effect.
    try {
      await apiGet(`/api/notes/${id}`)
    } catch {
      // Non-fatal — the entry may already be gone.
    }
    return
  }

  const entries = readRaw()
  const next = entries.map((entry) => (entry.id === id ? { ...entry, viewedAt: Date.now() } : entry))
  writeRaw(next)
}

export async function addHistoryEntry({ owner = GUEST_OWNER, text, result, isAuthenticated = false }) {
  const trimmedText = text.trim()
  const preview = trimmedText.length > 140 ? `${trimmedText.slice(0, 140)}…` : trimmedText

  if (isAuthenticated) {
    return apiPost('/api/notes', { preview, text, result })
  }

  const now = Date.now()
  const entries = readRaw()

  const entry = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    owner,
    createdAt: now,
    viewedAt: now,
    preview,
    text,
    result,
  }

  const ownersEntries = entries.filter((e) => e.owner === owner)
  const otherEntries = entries.filter((e) => e.owner !== owner)
  const trimmedOwnerEntries = [entry, ...ownersEntries].slice(0, MAX_ENTRIES_PER_OWNER)

  writeRaw([...otherEntries, ...trimmedOwnerEntries])
  return entry
}

export async function removeHistoryEntry(id, isAuthenticated = false) {
  if (isAuthenticated) {
    await apiDelete(`/api/notes/${id}`)
    return
  }
  const next = readRaw().filter((entry) => entry.id !== id)
  writeRaw(next)
}

export async function clearHistory(owner = GUEST_OWNER, isAuthenticated = false) {
  if (isAuthenticated) {
    await apiDelete('/api/notes/clear/all')
    return
  }
  const next = readRaw().filter((entry) => entry.owner !== owner)
  writeRaw(next)
}

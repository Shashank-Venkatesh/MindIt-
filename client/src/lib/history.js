// Local history store.
//
// This is a placeholder persistence layer. It keeps generated runs in the
// browser's localStorage so the Dashboard has something real to show and
// interact with. Once the FastAPI backend is ready, swap these functions
// out for API calls (e.g. GET/POST/DELETE /api/history) — the shape of the
// entries below is designed to map directly onto that future API.

const STORAGE_KEY = 'mindit.history.v1'
const MAX_ENTRIES = 50

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

export function getHistory() {
  return readRaw().sort((a, b) => b.createdAt - a.createdAt)
}

export function addHistoryEntry({ text, result }) {
  const entries = readRaw()

  const trimmedText = text.trim()
  const preview = trimmedText.length > 140 ? `${trimmedText.slice(0, 140)}…` : trimmedText

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    preview,
    text,
    result,
  }

  const next = [entry, ...entries].slice(0, MAX_ENTRIES)
  writeRaw(next)
  return entry
}

export function removeHistoryEntry(id) {
  const next = readRaw().filter((entry) => entry.id !== id)
  writeRaw(next)
}

export function clearHistory() {
  writeRaw([])
}

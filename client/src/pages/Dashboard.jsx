import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon, TabBar, Panel } from '../components/ui'
import { FileDropzone } from '../components/FileDropzone'
import { MindMapDiagram } from '../components/MindMapDiagram'
import { buildStudyNotesModel, buildMindMapModel, pluralizeCount, formatTimestamp } from '../lib/pipeline'
import { addHistoryEntry, getRecentlyViewed, touchHistoryEntry, removeHistoryEntry, GUEST_OWNER } from '../lib/history'
import { useAuth } from '../context/useAuth'
import { apiFetch } from '../lib/api'
import * as pdfjsLib from 'pdfjs-dist'

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const SAMPLE_INPUT = `Overview:
Capture only the claims that can be traced back to source notes.

Semantic chunking:
Split the text into small semantic chunks before any summary work.

Topic modeling:
Group related chunks together so each local cluster stays focused.

Embeddings:
Use similarity scoring to find the strongest passages for each cluster.

RAG inside RAG:
Draft the final note from the top passages, then run a smaller RAG pass inside each topic cluster.

Follow-up:
If a cluster feels thin, split it again and pull in one more source passage.`

const INPUT_MODES = [
  { value: 'text', label: 'Paste text' },
  { value: 'file', label: 'Upload file' },
]

const TEXT_FILE_EXTENSIONS = new Set(['txt', 'md', 'markdown'])
const PDF_FILE_EXTENSIONS = new Set(['pdf'])

export function Dashboard() {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  const openedEntry = location.state?.historyEntry ?? null
  const owner = isAuthenticated ? user.email : GUEST_OWNER

  const [text, setText] = useState(openedEntry?.text ?? SAMPLE_INPUT)
  const [inputMode, setInputMode] = useState('text')
  const [fileMeta, setFileMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(openedEntry?.result ?? null)
  const [viewMode, setViewMode] = useState('summary')
  const [savedNotice, setSavedNotice] = useState(false)
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [activeEntryId, setActiveEntryId] = useState(openedEntry?.id ?? null)
  const [summaryQuery, setSummaryQuery] = useState('')

  async function refreshRecentlyViewed() {
    try {
      setRecentlyViewed(await getRecentlyViewed(owner, isAuthenticated))
    } catch {
      // Non-fatal — the "recently viewed" list is a nice-to-have.
    }
  }

  useEffect(() => {
    refreshRecentlyViewed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, isAuthenticated])

  const studyNotes = buildStudyNotesModel(result)
  const mindMapTopics = buildMindMapModel(result)
  const hasOutput = Boolean(result)

  // Search finder for the summary section: filter sections whose title or
  // paragraph text matches the query (case-insensitive substring match).
  const summarySearchActive = summaryQuery.trim().length > 0
  const filteredSummarySections = useMemo(() => {
    if (!summarySearchActive) {
      return studyNotes.sections
    }
    const needle = summaryQuery.trim().toLowerCase()
    return studyNotes.sections.filter((section) => {
      if (section.title.toLowerCase().includes(needle)) {
        return true
      }
      return section.paragraphs.some((paragraph) => paragraph.toLowerCase().includes(needle))
    })
  }, [studyNotes.sections, summaryQuery, summarySearchActive])

  // Escape regex special characters in a literal string for safe highlighting.
  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // Highlight occurrences of the query inside a string. Returns an array of
  // strings and <mark> elements so React can render them efficiently.
  function highlightMatches(text) {
    if (!summarySearchActive) {
      return text
    }
    const needle = summaryQuery.trim()
    if (!needle) {
      return text
    }
    const pattern = new RegExp(`(${escapeRegExp(needle)})`, 'gi')
    const parts = text.split(pattern)
    return parts.map((part, index) =>
      part.toLowerCase() === needle.toLowerCase() ? (
        <mark key={index} className="rounded bg-primary/20 px-0.5 text-on-surface">{part}</mark>
      ) : (
        part
      )
    )
  }

  const pipeline = result?.pipeline || {}
  const chunkCount = pipeline.chunkCount ?? result?.semantic?.chunks?.length ?? 0
  const topicCount = pipeline.topicCount ?? result?.topics?.clusters?.length ?? 0
  const embeddingDimension = pipeline.embeddingDimension ?? result?.embeddings?.dimension ?? 0
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  const fileBlocksGenerate = inputMode === 'file' && fileMeta && fileMeta.status !== 'ready'
  const canGenerate = !loading && Boolean(text.trim()) && !fileBlocksGenerate

  async function extractTextFromPdf(file) {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      fullText += pageText + '\n\n'
    }
    return fullText.trim()
  }

  function handleFileSelect(file) {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''

    if (!TEXT_FILE_EXTENSIONS.has(extension) && !PDF_FILE_EXTENSIONS.has(extension)) {
      setFileMeta({ name: file.name, size: file.size, status: 'unsupported' })
      setError('Only .txt, .md, and .pdf files are supported.')
      return
    }

    setFileMeta({ name: file.name, size: file.size, status: 'reading' })
    setError('')

    if (TEXT_FILE_EXTENSIONS.has(extension)) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setText(String(event.target?.result || ''))
        setFileMeta({ name: file.name, size: file.size, status: 'ready' })
      }
      reader.onerror = () => {
        setFileMeta({ name: file.name, size: file.size, status: 'error' })
      }
      reader.readAsText(file)
    } else {
      // PDF file — extract text using pdf.js
      extractTextFromPdf(file)
        .then(extractedText => {
          if (!extractedText) {
            setFileMeta({ name: file.name, size: file.size, status: 'error' })
            setError('No text could be extracted from this PDF. It may be a scanned image.')
            return
          }
          setText(extractedText)
          setFileMeta({ name: file.name, size: file.size, status: 'ready' })
        })
        .catch(() => {
          setFileMeta({ name: file.name, size: file.size, status: 'error' })
          setError('Failed to extract text from PDF. Please try a different file.')
        })
    }
  }

  function handleRemoveFile() {
    setFileMeta(null)
    setText('')
  }

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setSavedNotice(false)
    setSummaryQuery('')

    try {
      const data = await apiFetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      setResult(data)
      setViewMode('summary')

      try {
        const entry = await addHistoryEntry({ owner, text, result: data, isAuthenticated })
        setSavedNotice(true)
        setActiveEntryId(entry.id)
        await refreshRecentlyViewed()
      } catch (saveError) {
        setError(`Summary generated, but it could not be saved: ${saveError.message}`)
      }
    } catch (fetchError) {
      setError(fetchError.message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  function handleUseExample() {
    setInputMode('text')
    setFileMeta(null)
    setText(SAMPLE_INPUT)
    setError('')
    setResult(null)
    setSavedNotice(false)
    setActiveEntryId(null)
  }

  async function handleOpenRecent(entry) {
    setInputMode('text')
    setFileMeta(null)
    setText(entry.text)
    setResult(entry.result)
    setViewMode('summary')
    setError('')
    setSavedNotice(false)
    setSummaryQuery('')
    setActiveEntryId(entry.id)
    await touchHistoryEntry(entry.id, isAuthenticated)
    await refreshRecentlyViewed()
  }

  async function handleRemoveRecent(id) {
    try {
      await removeHistoryEntry(id, isAuthenticated)
      setRecentlyViewed((entries) => entries.filter((entry) => entry.id !== id))
    } catch (removeError) {
      setError(removeError.message || 'Failed to delete that note.')
    }
  }

  const outputTabs = [
    { value: 'summary', label: 'Summary' },
    { value: 'mindmap', label: 'Mind map' },
  ]

  return (
    <>
      {/* Intro */}
      <section className="px-4 pt-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-on-surface sm:text-[28px]">Distill your notes</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
            Paste text or upload a file, and MindIt! returns a grounded summary and a mind map of the key topics.
          </p>
          {openedEntry ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm text-on-surface">
              <Icon name="history" className="text-[16px] text-primary" />
              Reviewing a saved run from your profile.
            </div>
          ) : null}
        </div>
      </section>

      {/* Workspace */}
      <section className="px-4 pt-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
            <TabBar
              options={INPUT_MODES}
              value={inputMode}
              onChange={(value) => {
                setInputMode(value)
                setError('')
              }}
            />

            <div className="mt-4">
              {inputMode === 'text' ? (
                <textarea
                  id="notes"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={10}
                  placeholder="Write paragraphs or bullet points..."
                  className="w-full resize-y rounded-lg border border-border bg-surface-alt p-4 font-mono text-[13px] leading-relaxed text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              ) : (
                <FileDropzone fileMeta={fileMeta} onFile={handleFileSelect} onRemove={handleRemoveFile} />
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-on-surface-variant"
              >
                <Icon name={loading ? 'progress_activity' : 'bolt'} className={`text-[16px] ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Generating…' : 'Generate'}
              </button>

              <button
                type="button"
                onClick={handleUseExample}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-white/5 active:scale-95"
              >
                Use example
              </button>

              {inputMode === 'text' ? (
                <span className="ml-auto text-xs text-on-surface-variant">{pluralizeCount(wordCount, 'word')}</span>
              ) : null}
            </div>

            {error ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm font-medium text-danger">
                <Icon name="error" className="text-[16px]" />
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Output */}
      {hasOutput ? (
        <section className="px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabBar options={outputTabs} value={viewMode} onChange={setViewMode} />
              <p className="text-xs text-on-surface-variant">
                {pluralizeCount(chunkCount, 'chunk')} · {pluralizeCount(topicCount, 'topic')} · {embeddingDimension || '—'} dims
              </p>
            </div>

            {savedNotice ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-sm text-on-surface">
                <Icon name="check_circle" className="text-[16px] text-primary" />
                {isAuthenticated ? (
                  <>
                    Saved to your profile.{' '}
                    <Link to="/profile" className="font-semibold text-primary hover:underline">
                      View history
                    </Link>
                  </>
                ) : (
                  <>
                    Saved for this session.{' '}
                    <Link to="/login" className="font-semibold text-primary hover:underline">
                      Log in
                    </Link>{' '}
                    to keep it tied to your profile.
                  </>
                )}
              </div>
            ) : null}

            {viewMode === 'summary' ? (
              <Panel title="Summary" subtitle={studyNotes.overview}>
                {/* Search finder: filter the generated summary text below. */}
                <div className="mb-4">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                      <Icon name="search" className="text-[18px]" />
                    </span>
                    <input
                      type="search"
                      value={summaryQuery}
                      onChange={(event) => setSummaryQuery(event.target.value)}
                      placeholder="Search the generated summary…"
                      aria-label="Search the generated summary"
                      className="w-full rounded-lg border border-border bg-surface-alt py-2 pl-9 pr-9 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    {summarySearchActive ? (
                      <button
                        type="button"
                        onClick={() => setSummaryQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-on-surface-variant transition hover:text-on-surface"
                      >
                        <Icon name="close" className="text-[16px]" />
                      </button>
                    ) : null}
                  </div>
                  {summarySearchActive ? (
                    <p className="mt-1.5 text-xs text-on-surface-variant">
                      {filteredSummarySections.length > 0
                        ? `${filteredSummarySections.length} of ${studyNotes.sections.length} sections match “${summaryQuery.trim()}”.`
                        : `No sections match “${summaryQuery.trim()}”.`}
                    </p>
                  ) : null}
                </div>

                {filteredSummarySections.length > 0 ? (
                  <div className="space-y-3">
                    {filteredSummarySections.map((section) => (
                      <div key={section.id} className="rounded-lg border border-border/70 bg-surface-alt/60 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                          {highlightMatches(section.title)}
                        </p>
                        <div className="mt-1.5 space-y-1.5">
                          {section.paragraphs.map((paragraph, index) => (
                            <p key={`${section.id}-${index}`} className="text-sm leading-relaxed text-on-surface/90">
                              {highlightMatches(paragraph)}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
                    <Icon name="search_off" className="text-[20px] text-on-surface-variant" />
                    <p className="text-sm text-on-surface-variant">
                      No matching text in the generated summary. Try a different keyword.
                    </p>
                  </div>
                )}
              </Panel>
            ) : null}

            {viewMode === 'mindmap' ? (
              <Panel title="Mind map" subtitle="A quick visual map of how the topics in your notes relate to each other.">
                <MindMapDiagram topics={mindMapTopics} />
              </Panel>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
              <Icon name="auto_awesome" className="text-[22px] text-on-surface-variant" />
              <p className="text-sm font-medium text-on-surface">Nothing generated yet</p>
              <p className="max-w-sm text-sm text-on-surface-variant">
                Add your notes above and hit Generate to see a summary and mind map here.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Recently viewed */}
      <section className="px-4 pb-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Panel
            title="Recently viewed notes"
            subtitle={
              isAuthenticated
                ? 'Quick access to the notes you generated or opened most recently.'
                : 'Quick access for this session. Log in to keep these tied to your profile.'
            }
            actions={
              <Link to={isAuthenticated ? '/profile' : '/login'} className="shrink-0 text-xs font-semibold text-primary hover:underline">
                {isAuthenticated ? 'View all in profile' : 'Log in'}
              </Link>
            }
          >
            {recentlyViewed.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
                <Icon name="history" className="text-[20px] text-on-surface-variant" />
                <p className="text-sm text-on-surface-variant">Notes you generate or open will show up here.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {recentlyViewed.map((entry) => (
                  <li key={entry.id}>
                    <div
                      className={`group flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition ${
                        entry.id === activeEntryId
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border/70 bg-surface-alt/60 hover:border-on-surface-variant/30'
                      }`}
                    >
                      <button type="button" onClick={() => handleOpenRecent(entry)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium text-on-surface">{entry.preview || 'Untitled note'}</p>
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          {formatTimestamp(entry.viewedAt ?? entry.createdAt)}
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <Icon name="north_east" className="mt-0.5 text-[15px] text-on-surface-variant" />
                        <button
                          type="button"
                          onClick={() => handleRemoveRecent(entry.id)}
                          className="rounded-md p-1 text-on-surface-variant transition hover:bg-white/5 hover:text-danger"
                          aria-label="Delete entry"
                        >
                          <Icon name="delete" className="text-[16px]" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </section>
    </>
  )
}

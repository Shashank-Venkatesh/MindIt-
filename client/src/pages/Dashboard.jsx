import { useState } from 'react'
import { Icon, TabBar, Panel } from '../components/ui'
import { FileDropzone } from '../components/FileDropzone'
import { MindMapDiagram } from '../components/MindMapDiagram'
import { buildStudyNotesModel, buildMindMapModel, pluralizeCount } from '../lib/pipeline'
import { getHistory, addHistoryEntry, removeHistoryEntry, clearHistory } from '../lib/history'

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

function formatTimestamp(ms) {
  const date = new Date(ms)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function HistoryPanel({ history, activeId, onSelect, onRemove, onClear }) {
  return (
    <Panel
      title="History"
      subtitle="Previous runs from this browser. Saved locally for now — this will move to your account once the backend is connected."
      actions={
        history.length ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold text-on-surface-variant transition hover:bg-white/5 hover:text-danger"
          >
            Clear all
          </button>
        ) : null
      }
    >
      {history.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
          <Icon name="history" className="text-[20px] text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">Runs you generate will show up here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {history.map((entry) => (
            <li key={entry.id}>
              <div
                className={`group flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition ${
                  entry.id === activeId
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border/70 bg-surface-alt/60 hover:border-on-surface-variant/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(entry)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium text-on-surface">{entry.preview || 'Untitled note'}</p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">{formatTimestamp(entry.createdAt)}</p>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  className="shrink-0 rounded-md p-1 text-on-surface-variant opacity-0 transition hover:bg-white/5 hover:text-danger group-hover:opacity-100"
                  aria-label="Delete entry"
                >
                  <Icon name="delete" className="text-[16px]" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function Dashboard() {
  const [text, setText] = useState(SAMPLE_INPUT)
  const [inputMode, setInputMode] = useState('text')
  const [fileMeta, setFileMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [viewMode, setViewMode] = useState('summary')
  const [history, setHistory] = useState(() => getHistory())
  const [activeHistoryId, setActiveHistoryId] = useState(null)

  const studyNotes = buildStudyNotesModel(result)
  const mindMapTopics = buildMindMapModel(result)
  const hasOutput = Boolean(result)

  const pipeline = result?.pipeline || {}
  const chunkCount = pipeline.chunkCount ?? result?.semantic?.chunks?.length ?? 0
  const topicCount = pipeline.topicCount ?? result?.topics?.clusters?.length ?? 0
  const embeddingDimension = pipeline.embeddingDimension ?? result?.embeddings?.dimension ?? 0
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  const fileBlocksGenerate = inputMode === 'file' && fileMeta && fileMeta.status !== 'ready'
  const canGenerate = !loading && Boolean(text.trim()) && !fileBlocksGenerate

  function handleFileSelect(file) {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''

    if (!TEXT_FILE_EXTENSIONS.has(extension)) {
      setFileMeta({ name: file.name, size: file.size, status: 'unsupported' })
      return
    }

    setFileMeta({ name: file.name, size: file.size, status: 'reading' })
    setError('')

    const reader = new FileReader()

    reader.onload = (event) => {
      setText(String(event.target?.result || ''))
      setFileMeta({ name: file.name, size: file.size, status: 'ready' })
    }

    reader.onerror = () => {
      setFileMeta({ name: file.name, size: file.size, status: 'error' })
    }

    reader.readAsText(file)
  }

  function handleRemoveFile() {
    setFileMeta(null)
    setText('')
  }

  async function handleGenerate() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process notes.')
      }

      setResult(data)
      setViewMode('summary')

      const entry = addHistoryEntry({ text, result: data })
      setHistory(getHistory())
      setActiveHistoryId(entry.id)
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
    setActiveHistoryId(null)
  }

  function handleSelectHistory(entry) {
    setInputMode('text')
    setFileMeta(null)
    setText(entry.text)
    setResult(entry.result)
    setViewMode('summary')
    setError('')
    setActiveHistoryId(entry.id)
  }

  function handleRemoveHistory(id) {
    removeHistoryEntry(id)
    setHistory(getHistory())
    if (activeHistoryId === id) {
      setActiveHistoryId(null)
    }
  }

  function handleClearHistory() {
    clearHistory()
    setHistory([])
    setActiveHistoryId(null)
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

            {viewMode === 'summary' ? (
              <Panel title="Summary" subtitle={studyNotes.overview}>
                <div className="space-y-3">
                  {studyNotes.sections.map((section) => (
                    <div key={section.id} className="rounded-lg border border-border/70 bg-surface-alt/60 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                        {section.title}
                      </p>
                      <div className="mt-1.5 space-y-1.5">
                        {section.paragraphs.map((paragraph, index) => (
                          <p key={`${section.id}-${index}`} className="text-sm leading-relaxed text-on-surface/90">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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

      {/* History */}
      <section className="px-4 pb-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <HistoryPanel
            history={history}
            activeId={activeHistoryId}
            onSelect={handleSelectHistory}
            onRemove={handleRemoveHistory}
            onClear={handleClearHistory}
          />
        </div>
      </section>
    </>
  )
}

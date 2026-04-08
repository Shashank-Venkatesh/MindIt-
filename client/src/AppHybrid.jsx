import { useState } from 'react'

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

function SectionCard({ eyebrow, title, description, children, className = '' }) {
  return (
    <article className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-3">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-lg font-semibold text-slate-950 sm:text-xl">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p> : null}
      </div>
      {children}
    </article>
  )
}

function Pill({ children, tone = 'slate' }) {
  const toneClasses = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${toneClasses[tone] || toneClasses.slate}`}
    >
      {children}
    </span>
  )
}

function MetricTile({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{hint}</p> : null}
    </div>
  )
}

function TopicCard({ topic }) {
  const nestedRag = topic.rag || {}

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="text-base font-semibold text-slate-950">{topic.label}</h3>

      <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-950 p-3 text-slate-100">
        <p className="text-sm leading-relaxed text-slate-100">{nestedRag.summary}</p>
      </div>
    </article>
  )
}

function SourceCard({ source }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{source.id}</p>
          <p className="mt-1 text-xs font-semibold text-slate-950 sm:text-sm">
            {source.heading || source.kind || 'Source passage'}
          </p>
        </div>
        <Pill tone="emerald">{Math.round((source.score || 0) * 100)}%</Pill>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-700 sm:text-sm">{source.excerpt}</p>
    </article>
  )
}

function AppHybrid() {
  const [text, setText] = useState(SAMPLE_INPUT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const pipeline = result?.pipeline
  const semantic = result?.semantic
  const topics = result?.topics
  const embeddings = result?.embeddings
  const rag = result?.rag
  const semanticChunks = semantic?.chunks || []
  const topicClusters = topics?.clusters || []
  const topicCount = topicClusters.length
  const hasOutput = Boolean(pipeline || semanticChunks.length || topicCount || rag?.title)

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
    } catch (fetchError) {
      setError(fetchError.message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6ea_0%,#f7fafc_32%,#eef4ff_72%,#fffdf8_100%)] px-3 py-5 text-slate-800 sm:px-4 lg:px-6">
      <main className="mx-auto max-w-6xl">
        <header className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white/88 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
          <div className="max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">MindIt Hybrid</p>
            <h1 className="mt-2.5 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
              Semantic chunking, topic modeling, embeddings, and RAG inside RAG.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              Paste raw notes and get the full hybrid pass: chunk the text, group the chunks into topics,
              inspect the embeddings, and generate a grounded draft with nested retrieval.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <Pill tone="amber">Semantic chunking</Pill>
              <Pill tone="indigo">Topic modeling</Pill>
              <Pill tone="emerald">Embeddings</Pill>
              <Pill tone="slate">RAG inside RAG</Pill>
            </div>
          </div>
        </header>

        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <label htmlFor="notes" className="mb-2 block text-sm font-semibold text-slate-700">
            Notes Input
          </label>
          <textarea
            id="notes"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            placeholder="Write paragraphs or bullet points..."
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm leading-relaxed outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
          />

          <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>

            <button
              type="button"
              onClick={() => {
                setText(SAMPLE_INPUT)
                setError('')
                setResult(null)
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Load Example
            </button>
          </div>

          {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
        </section>

        {hasOutput ? (
          <section className="grid gap-4 xl:grid-cols-2">
            {pipeline ? (
              <SectionCard
                eyebrow="Pipeline"
                title="Hybrid run complete"
                description={pipeline.overview || 'Semantic chunking, topic modeling, embeddings, and RAG are all active.'}
                className="h-full"
              >
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricTile
                    label="Semantic chunks"
                    value={pipeline.chunkCount ?? semanticChunks.length}
                    hint="Primary passages split from the input."
                  />
                  <MetricTile
                    label="Topic clusters"
                    value={pipeline.topicCount ?? topicCount}
                    hint="Grouped chunks with nested retrieval."
                  />
                  <MetricTile
                    label="Embedding dims"
                    value={pipeline.embeddingDimension ?? embeddings?.dimension ?? 48}
                    hint="Hashed-IDF vector space size."
                  />
                  <MetricTile
                    label="RAG layers"
                    value={(rag?.topicRags?.length || 0) + 1}
                    hint="One note-wide pass plus topic-level passes."
                  />
                </div>
              </SectionCard>
            ) : null}

            {topics ? (
              <SectionCard
                eyebrow="1. Topic Modeling"
                title="Cluster map"
                description={topics.overview || 'Semantic chunks grouped into topic clusters.'}
                className="xl:col-span-2"
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {topicClusters.map((topic) => (
                    <TopicCard key={topic.id} topic={topic} />
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {rag ? (
              <SectionCard eyebrow="2. RAG" title="Hybrid RAG Note" description={rag.overview} className="h-full xl:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Hybrid summary</p>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-100">{rag.summary}</p>
                </div>

                <div className="mt-3.5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Takeaways</p>
                    <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-slate-700">
                      {rag.takeaways?.map((takeaway) => (
                        <li key={takeaway} className="rounded-xl bg-white px-3 py-2 shadow-sm">
                          {takeaway}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Draft lines</p>
                    <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-slate-700">
                      {rag.draft?.map((line) => (
                        <li key={line} className="rounded-xl bg-white px-3 py-2 shadow-sm">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {rag.sources?.length ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Grounding sources</p>
                      <div className="mt-2.5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                        {rag.sources.map((source) => (
                          <SourceCard key={source.id} source={source} />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {rag.followUps?.length ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 md:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">Follow-up prompts</p>
                      <ul className="mt-2.5 grid gap-2.5 md:grid-cols-2">
                        {rag.followUps.map((question) => (
                          <li key={question} className="rounded-xl bg-white/80 px-3 py-2 text-sm leading-relaxed text-amber-900">
                            {question}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default AppHybrid

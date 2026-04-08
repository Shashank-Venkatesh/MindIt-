import { useState } from 'react'

const SAMPLE_INPUT = `Project briefing:
Capture only the claims that can be traced back to source notes.

Decision log:
State the decision, then record the reason and the tradeoff.

RAG notes:
Retrieve the most relevant passages first, then draft the final note from those passages.

Follow-up:
If the draft feels thin, add one more source passage before rewriting.`

function SectionCard({ eyebrow, title, description, children, className = '' }) {
  return (
    <article className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <div className="mb-4">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
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
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone] || toneClasses.slate}`}>
      {children}
    </span>
  )
}

function App() {
  const [text, setText] = useState(SAMPLE_INPUT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const rag = result?.rag
  const hasOutput = Boolean(rag)

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ec_0%,#f8fafc_35%,#eef4ff_75%,#fffdf8_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-7xl">
        <header className="mb-8 overflow-hidden rounded-4xl border border-amber-200/80 bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">MindIt</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
              Turn raw notes into RAG drafts.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              Paste plain text and generate a retrieval-grounded draft built from the most relevant source passages.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Pill tone="amber">RAG</Pill>
              <Pill tone="emerald">Retrieval</Pill>
              <Pill tone="indigo">Grounded draft</Pill>
            </div>

            <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Privacy: notes are processed in-session only and are not stored. Data is gone once you clear input, refresh, or leave the site.
            </p>
          </div>
        </header>

        <section className="mb-6 rounded-4xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label htmlFor="notes" className="mb-2 block text-sm font-semibold text-slate-700">
            Notes Input
          </label>
          <textarea
            id="notes"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={12}
            placeholder="Write paragraphs or bullet points..."
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm leading-relaxed outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
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
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Load Example
            </button>
          </div>

          {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
        </section>

        {hasOutput ? (
          <section className="space-y-6">
            {rag ? (
              <SectionCard
                eyebrow="RAG"
                title={rag.title || 'Retrieval-grounded note draft'}
                description={rag.overview || 'Retrieved source passages are synthesized into a grounded draft.'}
              >
                <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Generated note</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-100 sm:text-base">
                    {rag.summary || 'No summary could be generated from the provided notes.'}
                  </p>

                  {rag.takeaways?.length ? (
                    <div className="mt-5 grid gap-3">
                      {rag.takeaways.map((takeaway, index) => (
                        <div key={`${takeaway}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-slate-100">
                          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-slate-200">
                            {index + 1}
                          </span>
                          {takeaway}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {rag.sources?.length ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Grounding</p>
                    <div className="mt-3 space-y-3">
                      {rag.sources.map((source) => (
                        <div key={source.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{source.id}</p>
                              <p className="mt-2 text-sm leading-relaxed text-slate-700">{source.excerpt}</p>
                            </div>
                            <Pill tone="emerald">{Math.round((source.score || 0) * 100)}%</Pill>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {rag.followUps?.length ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Follow-up prompts</p>
                    <ul className="mt-3 space-y-2 text-sm text-amber-900">
                      {rag.followUps.map((question) => (
                        <li key={question} className="rounded-xl bg-white/70 px-3 py-2">
                          {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </SectionCard>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App

import { Icon, Panel } from '../components/ui'

const PIPELINE_STEPS = [
  {
    icon: 'content_cut',
    title: 'Semantic chunking',
    description: 'Your text is split into small, meaning-based chunks before any summarizing happens, so ideas do not get blended together.',
  },
  {
    icon: 'hub',
    title: 'Topic modeling',
    description: 'Related chunks are grouped into topic clusters, so each part of the summary stays focused on one idea at a time.',
  },
  {
    icon: 'scatter_plot',
    title: 'Embeddings',
    description: 'Similarity scoring finds the passages that matter most inside each cluster, filtering out noise.',
  },
  {
    icon: 'auto_awesome',
    title: 'RAG inside RAG',
    description: 'The final note is drafted from the strongest passages, with a smaller retrieval pass run inside each topic cluster for grounding.',
  },
]

const PRINCIPLES = [
  {
    icon: 'anchor',
    title: 'Grounded, not generic',
    description: 'Summaries stay traceable back to your source notes instead of turning into a generic, made-up recap.',
  },
  {
    icon: 'account_tree',
    title: 'See the shape of your notes',
    description: 'The mind map view shows how topics relate to each other at a glance, not just a wall of text.',
  },
  {
    icon: 'bolt',
    title: 'Fast and lightweight',
    description: 'Paste text or drop in a .txt / .md file and get a structured summary in seconds.',
  },
]

export function About() {
  return (
    <div className="px-4 pb-16 pt-10 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <section>
          <h1 className="text-2xl font-bold text-on-surface sm:text-[28px]">
            About MindIt<span className="text-primary">!</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            MindIt! turns long, messy notes into a grounded summary and a visual mind map, so you can
            review the key ideas without re-reading the whole source.
          </p>
        </section>

        <section>
          <Panel title="How it works" subtitle="Every run goes through the same four-stage pipeline.">
            <div className="grid gap-3 sm:grid-cols-2">
              {PIPELINE_STEPS.map((step) => (
                <div key={step.title} className="rounded-lg border border-border/70 bg-surface-alt/60 p-4">
                  <div className="flex items-center gap-2">
                    <Icon name={step.icon} className="text-[18px] text-primary" />
                    <p className="text-sm font-semibold text-on-surface">{step.title}</p>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{step.description}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section>
          <Panel title="Why it's built this way">
            <div className="space-y-3">
              {PRINCIPLES.map((principle) => (
                <div key={principle.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-alt">
                    <Icon name={principle.icon} className="text-[16px] text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{principle.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-on-surface-variant">{principle.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section>
          <Panel title="Your data">
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Log in from the header to save runs to your profile, where you can revisit any previous
              text or file summary. Everything is currently kept locally in your browser rather than a
              real account — full backend-backed storage is on the roadmap.
            </p>
          </Panel>
        </section>
      </div>
    </div>
  )
}

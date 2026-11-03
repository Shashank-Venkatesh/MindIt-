import { Icon, Panel } from '../components/ui'

const FEATURES = [
  {
    icon: 'awesome',
    title: 'Smart summaries',
    description: 'Extract the key points from lengthy content and make it easier to review.',
  },
  {
    icon: 'account_tree',
    title: 'Visual mind maps',
    description: 'Organize topics and subtopics into a visual structure that helps ideas make sense.',
  },
  {
    title: 'Designed for independence',
    description: 'Built around your goal of generating summaries and mind maps without depending on external AI APIs.',
  },
]

export function About() {
  return (
    <div className="px-4 pb-16 pt-10 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">MindIt · About &amp; Vision</p>
          <h1 className="mt-3 text-2xl font-bold text-on-surface sm:text-[28px]">About MindIt</h1>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            MindIt helps you turn lengthy information into concise summaries and structured mind maps, making it
            easier to learn, organize ideas, and see the bigger picture.
          </p>
        </section>

        <section>
          <Panel title="Our mission">
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Make learning simpler by helping people focus on what matters, connect ideas, and understand complex
              information without the clutter.
            </p>
          </Panel>
        </section>

        <section>
          <Panel title="What MindIt helps you do">
            <div className="grid gap-3 sm:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-lg border border-border/70 bg-surface-alt/60 p-4">
                  <Icon name={feature.icon} className="text-[20px] text-primary" />
                  <p className="mt-3 text-sm font-semibold text-on-surface">{feature.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{feature.description}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-6 text-center sm:px-6">
          <p className="text-base font-semibold text-on-surface">Built with curiosity. Designed for clarity.</p>
        </section>
      </div>
    </div>
  )
}

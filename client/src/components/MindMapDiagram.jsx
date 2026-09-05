import { useMemo } from 'react'
import { GraphView } from './GraphView'

export function MindMapDiagram({ topics }) {
  const { nodes, edges } = useMemo(() => buildGraph(topics), [topics])

  if (!topics.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
        <span className="material-symbols-outlined text-[22px] text-on-surface-variant">hub</span>
        <p className="text-sm text-on-surface-variant">Not enough topic structure yet to draw a mind map.</p>
      </div>
    )
  }

  return (
    <GraphView
      nodes={nodes}
      edges={edges}
      centerLabel="Notes overview"
      height={520}
      cardMode
    />
  )
}

function buildGraph(topics) {
  const centerId = 'center'
  const nodes = [
    {
      id: centerId,
      label: 'Notes overview',
      type: 'center',
      radius: 16,
      color: '#6366f1',
      detail: 'The central node connects every topic heading extracted from your notes.',
    },
  ]

  const edges = []

  // Flash-card mind map: one card per topic heading only — no keyword leaves.
  // Each card shows just the heading so it can be used as a flash card.
  topics.forEach((topic) => {
    nodes.push({
      id: topic.id,
      label: topic.label,
      type: 'card',
      color: '#22d3ee',
      detail: topic.keywords?.length
        ? `Keywords: ${topic.keywords.join(', ')}`
        : 'A topic heading extracted from your notes.',
    })
    edges.push({ source: centerId, target: topic.id })
  })

  return { nodes, edges }
}

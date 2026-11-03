import { X, ExternalLink } from 'lucide-react'
import { Graph } from '@/types/graph'
import { useGraphStore } from '@/store/useGraphStore'

export function NodeDetailPanel({ graph }: { graph: Graph }) {
  const selectedId = useGraphStore((state) => state.selectedId)
  const setSelectedId = useGraphStore((state) => state.setSelectedId)
  const setLocalRoot = useGraphStore((state) => state.setLocalRoot)
  const node = graph.nodes.find((item) => item.id === selectedId)
  if (!node) return null
  const neighbors = graph.links.flatMap((link) => {
    if (link.source === node.id) return [{ id: link.target, label: link.label || 'connected to' }]
    if (link.target === node.id) return [{ id: link.source, label: link.label || 'connected to' }]
    return []
  }).map((item) => ({ ...item, node: graph.nodes.find((candidate) => candidate.id === item.id) })).filter((item) => item.node)
  return <aside className="absolute inset-x-3 bottom-3 z-20 max-h-[70vh] overflow-auto rounded-lg border border-neutral-800 bg-neutral-900/95 p-4 shadow-2xl backdrop-blur sm:inset-y-3 sm:left-auto sm:right-3 sm:w-80">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-lg font-medium text-neutral-100">{node.label}</p><p className="mt-1 text-xs uppercase tracking-wider text-neutral-500">{node.group}</p></div>
      <button onClick={() => setSelectedId(null)} className="text-neutral-500 transition hover:text-neutral-100" aria-label="Close details"><X size={17} /></button>
    </div>
    <p className="mt-4 text-sm leading-6 text-neutral-400">{node.definition || 'No definition available for this node.'}</p>
    <p className="mt-4 text-xs text-neutral-600">{neighbors.length} direct connections</p>
    <div className="mt-2 space-y-1">{neighbors.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm text-neutral-300 transition hover:bg-neutral-800"><span>{item.node?.label}</span><span className="ml-2 text-[10px] text-neutral-600">{item.label}</span></button>)}</div>
    <button onClick={() => setLocalRoot(node.id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800"><ExternalLink size={14} /> Show local graph</button>
  </aside>
}

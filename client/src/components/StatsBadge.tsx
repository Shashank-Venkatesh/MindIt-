import { Graph } from '@/types/graph'

export function StatsBadge({ graph }: { graph: Graph }) {
  const groups = new Set(graph.nodes.map((node) => node.group)).size
  return <div className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1.5 text-[11px] text-neutral-500 shadow-lg backdrop-blur">{graph.nodes.length} nodes <span className="text-neutral-700">·</span> {graph.links.length} links <span className="text-neutral-700">·</span> {groups} groups</div>
}

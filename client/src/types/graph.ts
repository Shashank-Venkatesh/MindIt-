export type GraphSize = 'small' | 'medium' | 'large'
export type GraphLevel = 'beginner' | 'intermediate' | 'expert'

export interface GraphNode {
  id: string
  label: string
  group: string
  definition?: string
}

export interface GraphLink {
  source: string
  target: string
  label?: string
}

export interface Graph {
  graph_id: string
  title: string
  nodes: GraphNode[]
  links: GraphLink[]
}

export interface GraphSummary {
  graph_id: string
  title: string
  node_count: number
  created_at: string
}

export interface GenerateRequest {
  topic: string
  size: GraphSize
  level: GraphLevel
  source_text?: string
}

export interface GenerateResponse {
  graph_id: string
  status: 'queued' | 'done'
}

export interface PendingGraph {
  status: 'pending'
}

export function validateGraph(value: unknown): Graph {
  if (!value || typeof value !== 'object') throw new Error('The graph response is not valid JSON.')
  const graph = value as Partial<Graph>
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.links)) throw new Error('Graph must include nodes and links.')
  const ids = new Set<string>()
  graph.nodes.forEach((node) => {
    if (!node?.id || !node.label) throw new Error('Every node must include an id and label.')
    if (ids.has(node.id)) throw new Error(`Duplicate node id: ${node.id}`)
    ids.add(node.id)
  })
  graph.links.forEach((link) => {
    if (!link?.source || !link.target || !ids.has(link.source) || !ids.has(link.target)) {
      throw new Error('A graph link points to a missing node.')
    }
  })
  return {
    graph_id: graph.graph_id || `local-${Date.now()}`,
    title: graph.title || 'Untitled graph',
    nodes: graph.nodes,
    links: graph.links,
  }
}

import { Graph } from '@/types/graph'

const concepts = [
  ['Mind mapping', 'concept'], ['Nodes', 'structure'], ['Links', 'structure'], ['Graph theory', 'concept'],
  ['Knowledge', 'domain'], ['Memory', 'domain'], ['Visual learning', 'domain'], ['Ideas', 'content'],
  ['Relationships', 'content'], ['Clustering', 'analysis'], ['Centrality', 'analysis'], ['Discovery', 'workflow'],
  ['Navigation', 'workflow'], ['Context', 'content'], ['Topics', 'structure'], ['Notes', 'workflow'],
  ['Canvas', 'interface'], ['Search', 'interface'], ['Zoom', 'interface'], ['Filtering', 'interface'],
  ['Exploration', 'workflow'], ['Synthesis', 'analysis'], ['Recall', 'domain'], ['Structure', 'concept'],
] as const

const links = [
  [0, 1, 'contains'], [0, 2, 'connects'], [0, 3, 'uses'], [0, 4, 'organizes'], [0, 5, 'supports'],
  [1, 14, 'represents'], [1, 23, 'has form'], [2, 8, 'expresses'], [2, 3, 'models'],
  [3, 9, 'enables'], [3, 10, 'measures'], [4, 6, 'improves'], [4, 7, 'captures'],
  [5, 22, 'improves'], [6, 22, 'supports'], [7, 13, 'adds'], [8, 13, 'adds'],
  [9, 10, 'reveals'], [9, 21, 'supports'], [10, 20, 'guides'], [11, 12, 'supports'],
  [11, 20, 'enables'], [12, 17, 'uses'], [13, 14, 'organizes'], [14, 15, 'contains'],
  [15, 17, 'opens'], [16, 18, 'uses'], [17, 18, 'controls'], [17, 19, 'narrows'],
  [18, 19, 'adjusts'], [20, 21, 'drives'], [21, 22, 'strengthens'],
] as const

export const sampleGraph: Graph = {
  graph_id: 'sample',
  title: 'The shape of connected thinking',
  nodes: concepts.map(([label, group], index) => ({
    id: `sample-${index}`,
    label,
    group,
    definition: `A connected idea in the ${group} layer of this sample knowledge graph.`,
  })),
  links: links.map(([source, target, label]) => ({
    source: `sample-${source}`,
    target: `sample-${target}`,
    label,
  })),
}

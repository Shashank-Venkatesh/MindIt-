import { create } from 'zustand'
import { Graph } from '@/types/graph'

export interface Forces {
  center: number
  repel: number
  link: number
  distance: number
}

interface GraphState {
  graph: Graph | null
  selectedId: string | null
  localRoot: string | null
  localHops: number
  search: string
  groups: Record<string, boolean>
  groupColors: Record<string, string>
  minLinks: number
  showOrphans: boolean
  showLabels: boolean
  colorByGroup: boolean
  nodeScale: number
  linkWidth: number
  fadeThreshold: number
  animate: boolean
  forces: Forces
  setGraph: (graph: Graph) => void
  setSelectedId: (id: string | null) => void
  setLocalRoot: (id: string | null) => void
  setLocalHops: (hops: number) => void
  setSearch: (search: string) => void
  setGroup: (group: string, enabled: boolean) => void
  setGroupColor: (group: string, color: string) => void
  setSetting: <K extends keyof GraphState>(key: K, value: GraphState[K]) => void
  setForces: (forces: Partial<Forces>) => void
  resetForces: () => void
}

const defaultForces: Forces = { center: 0.08, repel: -120, link: 0.4, distance: 60 }

export const useGraphStore = create<GraphState>((set) => ({
  graph: null, selectedId: null, localRoot: null, localHops: 2, search: '',
  groups: {}, groupColors: {}, minLinks: 0, showOrphans: true, showLabels: true,
  colorByGroup: false, nodeScale: 0.85, linkWidth: 0.8, fadeThreshold: 1.05, animate: true,
  forces: defaultForces,
  setGraph: (graph) => set({ graph, selectedId: null, localRoot: null }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setLocalRoot: (localRoot) => set({ localRoot }),
  setLocalHops: (localHops) => set({ localHops }),
  setSearch: (search) => set({ search }),
  setGroup: (group, enabled) => set((state) => ({ groups: { ...state.groups, [group]: enabled } })),
  setGroupColor: (group, color) => set((state) => ({ groupColors: { ...state.groupColors, [group]: color } })),
  setSetting: (key, value) => set({ [key]: value } as Partial<GraphState>),
  setForces: (forces) => set((state) => ({ forces: { ...state.forces, ...forces } })),
  resetForces: () => set({ forces: defaultForces }),
}))

import { Graph } from '@/types/graph'
import { useGraphEngine } from '@/hooks/useGraphEngine'
import { useGraphStore } from '@/store/useGraphStore'
import { useShallow } from 'zustand/react/shallow'
import { useEffect } from 'react'

export function GraphCanvas({ graph, visibleNodeIds, resetSignal = 0 }: { graph: Graph; visibleNodeIds?: Set<string>; resetSignal?: number }) {
  const options = useGraphStore(useShallow((state) => ({
    forces: state.forces,
    showLabels: state.showLabels,
    colorByGroup: state.colorByGroup,
    groupColors: state.groupColors,
    nodeScale: state.nodeScale,
    linkWidth: state.linkWidth,
    fadeThreshold: state.fadeThreshold,
    animate: state.animate,
    search: state.search,
    setSelectedId: state.setSelectedId,
  })))
  const engine = useGraphEngine(graph, { ...options, visibleNodeIds, onSelect: options.setSelectedId })
  useEffect(() => { engine.resetView() }, [resetSignal, engine.resetView])

  return (
    <canvas
      ref={engine.canvasRef}
      className="h-full w-full touch-none"
      aria-label="Interactive undirected knowledge graph. Drag to pan, scroll to zoom, and drag nodes."
    />
  )
}

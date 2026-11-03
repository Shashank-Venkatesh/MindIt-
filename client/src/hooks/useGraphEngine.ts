import { useCallback, useEffect, useRef, useState } from 'react'
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, Simulation, SimulationNodeDatum } from 'd3-force'
import { quadtree, Quadtree } from 'd3-quadtree'
import { Graph, GraphLink, GraphNode } from '@/types/graph'
import { Forces } from '@/store/useGraphStore'

interface EngineNode extends GraphNode, SimulationNodeDatum {
  degree: number
  pinned?: boolean
}

interface EngineLink {
  source: EngineNode | string
  target: EngineNode | string
  label?: string
}

interface EngineOptions {
  forces: Forces
  showLabels: boolean
  colorByGroup: boolean
  groupColors: Record<string, string>
  nodeScale: number
  linkWidth: number
  fadeThreshold: number
  animate: boolean
  visibleNodeIds?: Set<string>
  search: string
  onSelect?: (id: string | null) => void
}

const palette = ['#9b9bb8', '#95a9b5', '#ad9cac', '#9da99a', '#b3a78f', '#8fa6aa', '#b09da0', '#9aa5bd']

function nodeId(value: EngineNode | string): string {
  return typeof value === 'string' ? value : value.id
}

export function useGraphEngine(graph: Graph | null, options: EngineOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simulationRef = useRef<Simulation<EngineNode, EngineLink> | null>(null)
  const nodesRef = useRef<EngineNode[]>([])
  const linksRef = useRef<EngineLink[]>([])
  const treeRef = useRef<Quadtree<EngineNode> | null>(null)
  const optionsRef = useRef(options)
  const transformRef = useRef({ x: 0, y: 0, k: 1 })
  const frameRef = useRef<number | null>(null)
  const hoveredRef = useRef<string | null>(null)
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null)
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  optionsRef.current = options
  hoveredRef.current = hoveredId

  const screenPoint = useCallback((event: Pick<MouseEvent, 'clientX' | 'clientY'>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const transform = transformRef.current
    return {
      x: (event.clientX - rect.left - transform.x) / transform.k,
      y: (event.clientY - rect.top - transform.y) / transform.k,
    }
  }, [])

  const requestDraw = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const canvas = canvasRef.current
      if (!canvas) return
      const context = canvas.getContext('2d')
      if (!context) return
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, rect.width, rect.height)
      context.save()
      const transform = transformRef.current
      context.translate(transform.x, transform.y)
      context.scale(transform.k, transform.k)

      const current = optionsRef.current
      const visible = current.visibleNodeIds
      const nodes = nodesRef.current.filter((node) => !visible || visible.has(node.id))
      const visibleIds = new Set(nodes.map((node) => node.id))
      const adjacency = new Map<string, Set<string>>()
      linksRef.current.forEach((link) => {
        const source = nodeId(link.source)
        const target = nodeId(link.target)
        if (visibleIds.has(source) && visibleIds.has(target)) {
          if (!adjacency.has(source)) adjacency.set(source, new Set())
          if (!adjacency.has(target)) adjacency.set(target, new Set())
          adjacency.get(source)?.add(target)
          adjacency.get(target)?.add(source)
        }
      })
      const focus = hoveredRef.current
      const neighborIds = focus ? adjacency.get(focus) || new Set<string>() : null
      const search = current.search.trim().toLowerCase()

      linksRef.current.forEach((link) => {
        const source = link.source as EngineNode
        const target = link.target as EngineNode
        if (!source.x || !target.x || !visibleIds.has(source.id) || !visibleIds.has(target.id)) return
        const isFocused = !focus || source.id === focus || target.id === focus || neighborIds?.has(source.id) || neighborIds?.has(target.id)
        context.globalAlpha = focus && !isFocused ? 0.08 : 0.34
        context.strokeStyle = focus && isFocused ? '#9b9bb8' : '#555'
        context.lineWidth = current.linkWidth
        context.beginPath()
        context.moveTo(source.x ?? 0, source.y ?? 0)
        context.lineTo(target.x ?? 0, target.y ?? 0)
        context.stroke()
      })

      nodes.forEach((node) => {
        if (node.x === undefined || node.y === undefined) return
        const isNeighbor = focus === node.id || neighborIds?.has(node.id)
        const isDimmed = Boolean(focus && !isNeighbor)
        const matches = !search || node.label.toLowerCase().includes(search)
        const color = current.colorByGroup
          ? current.groupColors[node.group] || palette[Math.abs(node.group.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palette.length]
          : '#9b9bb8'
        const radius = Math.max(3, Math.min(16, 3 + Math.sqrt(node.degree + 1) * 2.3)) * current.nodeScale
        context.globalAlpha = isDimmed || !matches ? 0.15 : 1
        context.fillStyle = color
        context.beginPath()
        context.arc(node.x, node.y, radius, 0, Math.PI * 2)
        context.fill()
        if (node.id === focus) {
          context.strokeStyle = '#f2f0ff'
          context.lineWidth = 2
          context.stroke()
        }
        const labelVisible = current.showLabels && (node.id === focus || isNeighbor || (transform.k > current.fadeThreshold && node.degree >= 3))
        if (labelVisible && transform.k > 0.45 && (!focus || isNeighbor)) {
          context.globalAlpha = isDimmed ? 0.15 : 0.88
          context.fillStyle = '#d7d4df'
          context.font = '11px Inter, sans-serif'
          context.textAlign = 'center'
          context.fillText(node.label, node.x, node.y + radius + 14)
        }
      })
      context.restore()
    })
  }, [])

  const resetView = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    transformRef.current = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2, k: 1 }
    requestDraw()
  }, [requestDraw])

  const setForces = useCallback((forces: Partial<Forces>) => {
    const simulation = simulationRef.current
    if (!simulation) return
    const next = { ...optionsRef.current.forces, ...forces }
    optionsRef.current = { ...optionsRef.current, forces: next }
    simulation.force('center', forceCenter((canvasRef.current?.clientWidth || 900) / 2, (canvasRef.current?.clientHeight || 520) / 2).strength(next.center))
    simulation.force('charge', forceManyBody<EngineNode>().strength(next.repel))
    simulation.force('link', forceLink<EngineNode, EngineLink>(linksRef.current).id((node) => node.id).distance(next.distance).strength(next.link))
    simulation.alpha(0.35).restart()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !graph) return
    const degree = new Map<string, number>()
    graph.links.forEach((link) => {
      degree.set(link.source, (degree.get(link.source) || 0) + 1)
      degree.set(link.target, (degree.get(link.target) || 0) + 1)
    })
    const nodes: EngineNode[] = graph.nodes.map((node) => ({ ...node, degree: degree.get(node.id) || 0 }))
    const links: EngineLink[] = graph.links.map((link) => ({ ...link }))
    nodesRef.current = nodes
    linksRef.current = links
    const width = canvas.clientWidth || 900
    const height = canvas.clientHeight || 520
    transformRef.current = { x: width / 2, y: height / 2, k: 1 }
    const simulation = forceSimulation<EngineNode>(nodes)
      .force('link', forceLink<EngineNode, EngineLink>(links).id((node) => node.id).distance(options.forces.distance).strength(options.forces.link))
      .force('charge', forceManyBody<EngineNode>().strength(options.forces.repel))
      .force('center', forceCenter(width / 2, height / 2).strength(options.forces.center))
      .force('collision', forceCollide<EngineNode>().radius((node) => 5 + Math.sqrt(node.degree + 1) * 2.3).strength(0.8))
      .alphaDecay(0.035)
    simulationRef.current = simulation
    simulation.on('tick', requestDraw)
    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      simulation.force('center', forceCenter(rect.width / 2, rect.height / 2).strength(optionsRef.current.forces.center))
      requestDraw()
    })
    resizeObserver.observe(canvas)
    return () => {
      simulation.stop()
      resizeObserver.disconnect()
      simulationRef.current = null
    }
  }, [graph, requestDraw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !graph) return
    const updateTree = () => {
      const visible = optionsRef.current.visibleNodeIds
      const nodes = nodesRef.current.filter((node) => !visible || visible.has(node.id))
      treeRef.current = quadtree(nodes, (node) => node.x || 0, (node) => node.y || 0)
      requestDraw()
    }
    const pointerPosition = (event: PointerEvent) => screenPoint(event)
    const hit = (event: PointerEvent) => {
      const point = pointerPosition(event)
      return treeRef.current?.find(point.x, point.y, 22)
    }
    const onMove = (event: PointerEvent) => {
      const node = hit(event)
      setHoveredId(node?.id || null)
      if (dragRef.current) {
        const point = pointerPosition(event)
        const dragged = nodesRef.current.find((item) => item.id === dragRef.current?.id)
        if (dragged) {
          dragged.fx = point.x
          dragged.fy = point.y
          dragRef.current.moved = true
          simulationRef.current?.alphaTarget(0.3).restart()
          requestDraw()
        }
      } else if (panRef.current) {
        transformRef.current.x = panRef.current.tx + event.clientX - panRef.current.x
        transformRef.current.y = panRef.current.ty + event.clientY - panRef.current.y
        requestDraw()
      }
    }
    const onDown = (event: PointerEvent) => {
      const node = hit(event)
      canvas.setPointerCapture(event.pointerId)
      if (node) {
        dragRef.current = { id: node.id, moved: false }
      } else {
        panRef.current = { x: event.clientX, y: event.clientY, tx: transformRef.current.x, ty: transformRef.current.y }
      }
    }
    const onUp = (event: PointerEvent) => {
      if (dragRef.current) {
        if (!dragRef.current.moved) optionsRef.current.onSelect?.(dragRef.current.id)
        simulationRef.current?.alphaTarget(0)
      } else if (panRef.current && Math.abs(panRef.current.x - event.clientX) < 3 && Math.abs(panRef.current.y - event.clientY) < 3) {
        optionsRef.current.onSelect?.(null)
      }
      dragRef.current = null
      panRef.current = null
    }
    const onDoubleClick = (event: MouseEvent) => {
      const point = screenPoint(event)
      const node = treeRef.current?.find(point.x, point.y, 22)
      if (node) {
        node.fx = undefined
        node.fy = undefined
        simulationRef.current?.alpha(0.3).restart()
      }
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const before = screenPoint(event)
      const factor = event.deltaY < 0 ? 1.12 : 0.89
      transformRef.current.k = Math.max(0.35, Math.min(4, transformRef.current.k * factor))
      const rect = canvas.getBoundingClientRect()
      transformRef.current.x = event.clientX - rect.left - before.x * transformRef.current.k
      transformRef.current.y = event.clientY - rect.top - before.y * transformRef.current.k
      requestDraw()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHoveredId(null)
    }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onUp)
    canvas.addEventListener('dblclick', onDoubleClick)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    const interval = window.setInterval(updateTree, 80)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onUp)
      canvas.removeEventListener('dblclick', onDoubleClick)
      canvas.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.clearInterval(interval)
    }
  }, [graph, requestDraw, screenPoint])

  useEffect(() => {
    requestDraw()
    if (options.animate) simulationRef.current?.restart()
    else simulationRef.current?.stop()
  }, [options.animate, requestDraw])

  useEffect(() => {
    requestDraw()
  }, [
    options.visibleNodeIds,
    options.search,
    options.showLabels,
    options.colorByGroup,
    options.groupColors,
    options.nodeScale,
    options.linkWidth,
    options.fadeThreshold,
    requestDraw,
  ])

  return { canvasRef, hoveredId, resetView, setForces, nodesRef, linksRef }
}

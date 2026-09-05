import { useEffect, useMemo, useRef, useState, useCallback } from 'react'

/**
 * Obsidian-style force-directed graph view.
 *
 * Renders nodes as glowing dots with labels and edges as curved links.
 * Supports pan, zoom, drag, and hover highlighting. Pure SVG + a tiny
 * physics simulation — no external graph library needed.
 */

const PALETTE = [
  '#6366f1', // primary (indigo)
  '#22d3ee', // accent (cyan)
  '#a5b4fc', // secondary (light indigo)
  '#fbbf24', // tertiary (amber)
  '#f472b6', // pink
  '#34d399', // emerald
  '#f87171', // red
  '#c084fc', // purple
]

function hashHue(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0
  }
  return h
}

export function GraphView({ nodes, edges, centerLabel = 'Notes', height = 520, cardMode = false }) {
  const svgRef = useRef(null)
  const [positions, setPositions] = useState(() => initPositions(nodes))
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const [dragging, setDragging] = useState(null) // { id, offsetX, offsetY }
  const [panning, setPanning] = useState(null) // { startX, startY, originX, originY }
  const frameRef = useRef(null)
  const velRef = useRef({})

  // Re-init positions when the node set changes identity.
  useEffect(() => {
    setPositions(initPositions(nodes))
    velRef.current = {}
    setSelected(null)
    setHovered(null)
  }, [nodes])

  // Physics simulation loop.
  useEffect(() => {
    let mounted = true

    const step = () => {
      if (!mounted) return

      setPositions((prev) => {
        const next = { ...prev }
        const ids = Object.keys(next)
        const center = { x: 0, y: 0 }

        // Repulsion between all nodes.
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const a = next[ids[i]]
            const b = next[ids[j]]
            const dx = b.x - a.x
            const dy = b.y - a.y
            const distSq = dx * dx + dy * dy || 0.01
            const dist = Math.sqrt(distSq)
            const force = 9000 / distSq
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            applyForce(velRef, ids[i], -fx, -fy)
            applyForce(velRef, ids[j], fx, fy)
          }
        }

        // Attraction along edges.
        for (const edge of edges) {
          const a = next[edge.source]
          const b = next[edge.target]
          if (!a || !b) continue
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
          const target = cardMode ? 220 : 160
          const force = (dist - target) * 0.02
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          applyForce(velRef, edge.source, fx, fy)
          applyForce(velRef, edge.target, -fx, -fy)
        }

        // Gentle pull toward center to keep graph on screen.
        for (const id of ids) {
          const p = next[id]
          applyForce(velRef, id, -p.x * 0.005, -p.y * 0.005)
        }

        // Integrate with damping.
        const damping = 0.82
        for (const id of ids) {
          const v = velRef.current[id] || { x: 0, y: 0 }
          const p = next[id]
          if (dragging?.id === id) {
            // Pinned — no movement from physics.
            velRef.current[id] = { x: 0, y: 0 }
            continue
          }
          const nx = p.x + v.x
          const ny = p.y + v.y
          next[id] = { x: nx, y: ny }
          velRef.current[id] = { x: v.x * damping, y: v.y * damping }
        }

        return next
      })

      frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)
    return () => {
      mounted = false
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [edges, dragging])

  // Wheel zoom.
  const handleWheel = useCallback((event) => {
    event.preventDefault()
    const delta = -event.deltaY * 0.001
    setTransform((t) => {
      const k = Math.min(3, Math.max(0.3, t.k * (1 + delta)))
      return { ...t, k }
    })
  }, [])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Pan handlers.
  const handleMouseDown = (event) => {
    if (event.target.closest('[data-node-id]')) return
    setPanning({ startX: event.clientX, startY: event.clientY, originX: transform.x, originY: transform.y })
  }

  const handleMouseMove = (event) => {
    if (panning) {
      const dx = event.clientX - panning.startX
      const dy = event.clientY - panning.startY
      setTransform((t) => ({ ...t, x: panning.originX + dx, y: panning.originY + dy }))
    } else if (dragging) {
      const rect = svgRef.current.getBoundingClientRect()
      const x = (event.clientX - rect.left - rect.width / 2 - transform.x) / transform.k
      const y = (event.clientY - rect.top - height / 2 - transform.y) / transform.k
      setPositions((prev) => ({ ...prev, [dragging.id]: { x: x - dragging.offsetX, y: y - dragging.offsetY } }))
    }
  }

  const handleMouseUp = () => {
    setPanning(null)
    setDragging(null)
  }

  const startNodeDrag = (event, node) => {
    event.stopPropagation()
    const rect = svgRef.current.getBoundingClientRect()
    const px = (event.clientX - rect.left - rect.width / 2 - transform.x) / transform.k
    const py = (event.clientY - rect.top - height / 2 - transform.y) / transform.k
    const pos = positions[node.id]
    setDragging({ id: node.id, offsetX: px - pos.x, offsetY: py - pos.y })
    setSelected(node.id)
  }

  // Highlight neighbors of hovered/selected node.
  const activeId = hovered || selected
  const connectedIds = useMemo(() => {
    if (!activeId) return null
    const set = new Set([activeId])
    for (const edge of edges) {
      if (edge.source === activeId) set.add(edge.target)
      if (edge.target === activeId) set.add(edge.source)
    }
    return set
  }, [activeId, edges])

  const isDimmed = (id) => connectedIds !== null && !connectedIds.has(id)
  const isEdgeActive = (edge) => connectedIds !== null && (edge.source === activeId || edge.target === activeId)

  const resetView = () => setTransform({ x: 0, y: 0, k: 1 })

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-background">
      <svg
        ref={svgRef}
        viewBox={`-${400} -${height / 2} 800 ${height}`}
        className="h-auto w-full cursor-grab"
        style={{ height, cursor: panning ? 'grabbing' : dragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {/* Edges */}
          {edges.map((edge, i) => {
            const a = positions[edge.source]
            const b = positions[edge.target]
            if (!a || !b) return null
            const active = isEdgeActive(edge)
            const dim = connectedIds !== null && !active
            // Curved path
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            const dx = b.x - a.x
            const dy = b.y - a.y
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            const nx = -dy / len
            const ny = dx / len
            const curve = 24
            const cx = mx + nx * curve
            const cy = my + ny * curve
            return (
              <path
                key={`edge-${i}`}
                d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
                fill="none"
                stroke={active ? '#6366f1' : '#2a3148'}
                strokeWidth={active ? 2 : 1}
                strokeOpacity={dim ? 0.15 : active ? 0.85 : 0.5}
                strokeDasharray={active ? '0' : '4 4'}
              />
            )
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = positions[node.id]
            if (!pos) return null
            const color = node.color || PALETTE[hashHue(node.id) % PALETTE.length]
            const dim = isDimmed(node.id)
            const isActive = activeId === node.id
            const r = node.radius || (node.type === 'center' ? 14 : 8)

            // Flash-card rendering: a rounded rectangle showing only the
            // heading text, so each card acts as a flash card.
            if (cardMode && node.type === 'card') {
              const label = truncate(node.label, 28)
              const cardW = Math.max(120, label.length * 7 + 28)
              const cardH = 44
              return (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  transform={`translate(${pos.x - cardW / 2} ${pos.y - cardH / 2})`}
                  style={{ cursor: 'pointer', opacity: dim ? 0.25 : 1, transition: 'opacity 0.2s' }}
                  onMouseDown={(e) => startNodeDrag(e, node)}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(e) => { e.stopPropagation(); setSelected(node.id === selected ? null : node.id) }}
                >
                  {/* Glow */}
                  <rect
                    x={-6}
                    y={-6}
                    width={cardW + 12}
                    height={cardH + 12}
                    rx={12}
                    fill={color}
                    opacity={isActive ? 0.35 : 0.18}
                    filter="url(#softGlow)"
                  />
                  {/* Card body */}
                  <rect
                    width={cardW}
                    height={cardH}
                    rx={10}
                    fill="#1a1f33"
                    stroke={color}
                    strokeWidth={isActive ? 2 : 1}
                    strokeOpacity={isActive ? 1 : 0.6}
                  />
                  {/* Accent bar */}
                  <rect width={4} height={cardH} rx={2} fill={color} />
                  {/* Heading text */}
                  <text
                    x={cardW / 2 + 2}
                    y={cardH / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={12}
                    fontWeight={600}
                    fill={isActive ? '#ffffff' : '#e2e8f0'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {label}
                  </text>
                </g>
              )
            }

            return (
              <g
                key={node.id}
                data-node-id={node.id}
                transform={`translate(${pos.x} ${pos.y})`}
                style={{ cursor: 'pointer', opacity: dim ? 0.25 : 1, transition: 'opacity 0.2s' }}
                onMouseDown={(e) => startNodeDrag(e, node)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={(e) => { e.stopPropagation(); setSelected(node.id === selected ? null : node.id) }}
              >
                {/* Glow */}
                <circle r={r * 2.4} fill={color} opacity={isActive ? 0.35 : 0.18} filter="url(#softGlow)" />
                {/* Core */}
                <circle r={r} fill={color} stroke="white" strokeWidth={isActive ? 2 : 0.5} strokeOpacity={isActive ? 1 : 0.3} />
                {/* Inner highlight */}
                <circle r={r * 0.5} fill="white" opacity={0.5} />
                {/* Label */}
                <text
                  y={r + 14}
                  textAnchor="middle"
                  fontSize={node.type === 'center' ? 13 : 11}
                  fontWeight={node.type === 'center' ? 700 : 500}
                  fill={isActive ? '#ffffff' : '#c7cce0'}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {truncate(node.label, node.type === 'center' ? 22 : 20)}
                </text>
                {node.sublabel ? (
                  <text
                    y={r + 27}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#8b91a7"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {truncate(node.sublabel, 24)}
                  </text>
                ) : null}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Controls overlay */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setTransform((t) => ({ ...t, k: Math.min(3, t.k * 1.2) }))}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/80 text-on-surface backdrop-blur transition hover:bg-surface-alt"
          aria-label="Zoom in"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
        <button
          type="button"
          onClick={() => setTransform((t) => ({ ...t, k: Math.max(0.3, t.k * 0.8) }))}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/80 text-on-surface backdrop-blur transition hover:bg-surface-alt"
          aria-label="Zoom out"
        >
          <span className="material-symbols-outlined text-[18px]">remove</span>
        </button>
        <button
          type="button"
          onClick={resetView}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/80 text-on-surface backdrop-blur transition hover:bg-surface-alt"
          aria-label="Reset view"
        >
          <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
        </button>
      </div>

      {/* Hint */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-border bg-surface/70 px-2.5 py-1.5 text-[11px] text-on-surface-variant backdrop-blur">
        Drag nodes · Scroll to zoom · Click to highlight
      </div>

      {/* Detail card for selected node */}
      {selected && nodes.find((n) => n.id === selected) ? (
        <div className="absolute bottom-3 right-3 max-w-[240px] rounded-lg border border-border bg-surface/90 p-3 text-sm backdrop-blur">
          <p className="font-semibold text-on-surface">{nodes.find((n) => n.id === selected).label}</p>
          {nodes.find((n) => n.id === selected).detail ? (
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              {nodes.find((n) => n.id === selected).detail}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mt-2 text-[11px] font-semibold text-primary hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  )
}

function initPositions(nodes) {
  const positions = {}
  nodes.forEach((node, i) => {
    if (node.type === 'center') {
      positions[node.id] = { x: 0, y: 0 }
    } else {
      const angle = (i / Math.max(1, nodes.length - 1)) * Math.PI * 2
      const r = 180
      positions[node.id] = { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
    }
  })
  return positions
}

function applyForce(velRef, id, fx, fy) {
  const v = velRef.current[id] || { x: 0, y: 0 }
  velRef.current[id] = { x: v.x + fx, y: v.y + fy }
}

function truncate(value, max) {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

import { Icon } from './ui'

export function MindMapDiagram({ topics }) {
  if (!topics.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
        <Icon name="hub" className="text-[22px] text-on-surface-variant" />
        <p className="text-sm text-on-surface-variant">Not enough topic structure yet to draw a mind map.</p>
      </div>
    )
  }

  const width = 640
  const height = 460
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(190, 110 + topics.length * 8)
  const nodeWidth = 132
  const nodeHeight = 46

  const nodes = topics.map((topic, index) => {
    const angle = (index / topics.length) * Math.PI * 2 - Math.PI / 2
    return {
      ...topic,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    }
  })

  const truncate = (value, max) => (value.length > max ? `${value.slice(0, max - 1)}…` : value)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
      {nodes.map((node, index) => (
        <line
          key={`line-${index}`}
          x1={centerX}
          y1={centerY}
          x2={node.x}
          y2={node.y}
          stroke="#242938"
          strokeWidth="1"
        />
      ))}

      <rect
        x={centerX - 70}
        y={centerY - 22}
        width="140"
        height="44"
        rx="10"
        fill="#161b28"
        stroke="#6366f1"
        strokeWidth="1.5"
      />
      <text x={centerX} y={centerY + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#eef0fa">
        Notes overview
      </text>

      {nodes.map((node, index) => (
        <g key={`node-${index}`}>
          <rect
            x={node.x - nodeWidth / 2}
            y={node.y - nodeHeight / 2}
            width={nodeWidth}
            height={nodeHeight}
            rx="9"
            fill="#10141f"
            stroke="#242938"
          />
          <text x={node.x} y={node.y - 3} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#eef0fa">
            {truncate(node.label, 18)}
          </text>
          {node.keywords?.length ? (
            <text x={node.x} y={node.y + 13} textAnchor="middle" fontSize="9.5" fill="#8b91a7">
              {node.keywords.slice(0, 2).join(' · ')}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  )
}

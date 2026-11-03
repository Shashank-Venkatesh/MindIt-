import { Maximize, Minus, Plus } from 'lucide-react'

export function ZoomControls({ onReset }: { onReset: () => void }) {
  return <div className="flex overflow-hidden rounded-full border border-neutral-800 bg-neutral-900/80 shadow-lg backdrop-blur">
    <button className="p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100" aria-label="Zoom out"><Minus size={15} /></button>
    <button onClick={onReset} className="border-x border-neutral-800 p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100" aria-label="Reset view"><Maximize size={15} /></button>
    <button className="p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100" aria-label="Zoom in"><Plus size={15} /></button>
  </div>
}

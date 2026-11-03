import { ArrowLeft } from 'lucide-react'
import { useGraphStore } from '@/store/useGraphStore'

export function LocalGraphControls() {
  const root = useGraphStore((state) => state.localRoot)
  const hops = useGraphStore((state) => state.localHops)
  const setHops = useGraphStore((state) => state.setLocalHops)
  const setRoot = useGraphStore((state) => state.setLocalRoot)
  if (!root) return null
  return <div className="absolute left-1/2 top-14 z-20 flex -translate-x-1/2 items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900/90 px-3 py-2 text-xs text-neutral-400 shadow-lg backdrop-blur"><span>Local graph</span><input type="range" min="1" max="4" value={hops} onChange={(event) => setHops(Number(event.target.value))} /><span>{hops} hops</span><button onClick={() => setRoot(null)} className="flex items-center gap-1 text-neutral-300 hover:text-white"><ArrowLeft size={13} /> Full graph</button></div>
}

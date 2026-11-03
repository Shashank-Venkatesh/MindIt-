import { Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useGraphStore } from '@/store/useGraphStore'

export function SearchBar() {
  const value = useGraphStore((state) => state.search)
  const setSearch = useGraphStore((state) => state.setSearch)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  return (
    <label className="flex h-9 w-56 items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/80 px-3 text-neutral-500 shadow-lg backdrop-blur transition focus-within:border-neutral-600">
      <Search size={16} />
      <input ref={inputRef} value={value} onChange={(event) => setSearch(event.target.value)} placeholder="Search nodes…" className="min-w-0 flex-1 bg-transparent text-sm text-neutral-200 outline-none placeholder:text-neutral-600" />
      <kbd className="hidden rounded border border-neutral-800 px-1 text-[10px] text-neutral-600 sm:block">⌘F</kbd>
    </label>
  )
}

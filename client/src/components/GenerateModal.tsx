import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { generateGraph } from '@/api/graphApi'
import { processDocument } from '@/api/graphApi'
import { GenerateRequest } from '@/types/graph'

export function GenerateModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: (id: string) => void }) {
  const [form, setForm] = useState<GenerateRequest>({ topic: '', size: 'medium', level: 'intermediate' })
  const [sourceName, setSourceName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit() {
    setError(''); setLoading(true)
    try { const result = await generateGraph(form); onGenerated(result.graph_id); onClose() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to generate graph.') } finally { setLoading(false) }
  }
  async function handleFile(file: File) {
    setError(''); setLoading(true)
    try {
      const result = await processDocument(file)
      setForm({ ...form, source_text: result.document.text, topic: form.topic || file.name.replace(/\.[^.]+$/, '') })
      setSourceName(file.name)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to read the document.') } finally { setLoading(false) }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-2xl"><div className="flex justify-between"><div><p className="flex items-center gap-2 font-medium text-neutral-100"><Sparkles size={16} /> Generate graph</p><p className="mt-1 text-xs text-neutral-500">Provide a topic, pasted notes, or a document.</p></div><button onClick={onClose} className="text-neutral-500 hover:text-neutral-100"><X size={17} /></button></div><input autoFocus value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} placeholder="Topic, e.g. climate systems" className="mt-5 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600" /><textarea value={form.source_text || ''} onChange={(event) => setForm({ ...form, source_text: event.target.value })} placeholder="Paste source notes (optional)…" rows={4} className="mt-3 w-full resize-none rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600" /><label className="mt-3 flex cursor-pointer items-center justify-center rounded-md border border-dashed border-neutral-700 px-3 py-2 text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"> {sourceName || 'Upload TXT, Markdown, PDF, or DOCX'}<input type="file" accept=".txt,.md,.markdown,.pdf,.docx" className="hidden" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} /></label><div className="mt-3 grid grid-cols-2 gap-3"><select value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value as GenerateRequest['size'] })} className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-300"><option value="small">small</option><option value="medium">medium</option><option value="large">large</option></select><select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value as GenerateRequest['level'] })} className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-300"><option value="beginner">beginner</option><option value="intermediate">intermediate</option><option value="expert">expert</option></select></div>{error && <p className="mt-3 text-xs text-red-400">{error}</p>}<button disabled={loading} onClick={submit} className="mt-5 w-full rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:opacity-50">{loading ? 'Reading…' : 'Generate'}</button></div></div>
}

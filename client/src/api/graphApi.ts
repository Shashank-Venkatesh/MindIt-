import { Graph, GenerateRequest, GenerateResponse, GraphSummary, PendingGraph, validateGraph } from '@/types/graph'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || body?.detail || `Request failed (${response.status}).`)
  return body as T
}

export async function generateGraph(payload: GenerateRequest): Promise<GenerateResponse> {
  if (!payload.topic.trim()) throw new Error('Enter a topic before generating a graph.')
  return request('/api/graphs/generate', { method: 'POST', body: JSON.stringify(payload) })
}

export async function processDocument(file: File): Promise<{ document: { text: string; filename: string; wordCount: number } }> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(`${API_URL}/api/process-document`, { method: 'POST', body: form })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || `Unable to read ${file.name}.`)
  return body
}

export async function getGraph(graphId: string): Promise<Graph | PendingGraph> {
  const result = await request<Graph | PendingGraph>(`/api/graphs/${encodeURIComponent(graphId)}`)
  return 'status' in result ? result : validateGraph(result)
}

export async function listGraphs(): Promise<GraphSummary[]> {
  return request('/api/graphs')
}

export function parseGraphJson(value: string): Graph {
  try {
    return validateGraph(JSON.parse(value))
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unable to load graph JSON.')
  }
}

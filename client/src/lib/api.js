import { getAccessToken } from './auth'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function apiFetch(path, options = {}) {
  const token = await getAccessToken()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? 15000)

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(path, { ...options, headers, signal: controller.signal })

    let data = null
    try {
      data = await response.json()
    } catch {
      // No JSON body (e.g. some error responses) — that's fine.
    }

    if (!response.ok) {
      const message = data?.detail || data?.error || `Request failed with status ${response.status}`
      throw new ApiError(message, response.status)
    }

    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError(`Request to ${path} timed out. Check that the backend and database are available.`, 408)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export const apiGet = (path) => apiFetch(path, { method: 'GET' })
export const apiPost = (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
export const apiDelete = (path) => apiFetch(path, { method: 'DELETE' })

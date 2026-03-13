const API_BASE = '/api'

type RequestOptions = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

class ApiError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function apiFetch<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = opts

  const config: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      ...headers,
    },
  }

  if (body !== undefined) {
    config.headers = { ...config.headers, 'Content-Type': 'application/json' } as HeadersInit
    config.body = JSON.stringify(body)
  }

  const res = await fetch(`${API_BASE}${path}`, config)
  const json = await res.json()

  if (!res.ok) {
    throw new ApiError(json.error || 'API Error', res.status, json.code || 'UNKNOWN')
  }

  return json as T
}

export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  const json = await res.json()

  if (!res.ok) {
    throw new ApiError(json.error || 'Upload Error', res.status, json.code || 'UNKNOWN')
  }

  return json as T
}

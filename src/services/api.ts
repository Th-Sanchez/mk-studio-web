const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8080/api'

const TOKEN_STORAGE_KEY = 'mk_studio_access_token'

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export interface ApiErrorPayload {
  timestamp?: string
  status: number
  error?: string
  message: string
  fieldErrors?: Record<string, string>
}

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(payload: ApiErrorPayload) {
    super(payload.message || 'Erro inesperado ao comunicar com o servidor.')
    this.status = payload.status
    this.fieldErrors = payload.fieldErrors
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (authenticated) {
    const token = getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      message: data?.message || `Erro HTTP ${response.status}`,
      fieldErrors: data?.fieldErrors,
    })
  }

  return data as T
}

export interface HealthResponse {
  status: string
  service?: string
  timestamp?: string
}

export function checkApiHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health')
}

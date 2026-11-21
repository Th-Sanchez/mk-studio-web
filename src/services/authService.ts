import { apiRequest, clearAccessToken, setAccessToken } from './api'

const USER_STORAGE_KEY = 'mk_studio_admin_user'

export interface AuthenticatedUser {
  id: string
  name: string
  email: string
  role: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: AuthenticatedUser
}

export async function loginAdmin(email: string, password: string): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setAccessToken(response.accessToken)
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user))
  return response
}

export function logoutAdmin(): void {
  clearAccessToken()
  localStorage.removeItem(USER_STORAGE_KEY)
}

export function getStoredAdminUser(): AuthenticatedUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthenticatedUser) : null
  } catch {
    return null
  }
}

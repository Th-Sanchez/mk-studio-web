import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAccessToken } from '../services/api'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = getAccessToken()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}

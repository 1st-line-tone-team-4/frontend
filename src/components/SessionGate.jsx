import { Navigate, useLocation } from 'react-router-dom'
import { USE_MOCK } from '@/api/client'
import { useAuthStore } from '@/stores/useAuthStore'

export default function SessionGate({ children }) {
  const token = useAuthStore((state) => state.accessToken)
  const location = useLocation()
  if (!USE_MOCK && !token) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return children
}

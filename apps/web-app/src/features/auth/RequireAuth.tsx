import { Navigate } from 'react-router-dom'
import { useCafe } from '../../mock/store'
import type { UserRole } from '../../shared/types'
import type { ReactNode } from 'react'

export function RequireAuth({
  children,
  roles,
  redirectTo,
}: {
  children: ReactNode
  roles?: UserRole[]
  redirectTo: string
}) {
  const { session, isHydrating } = useCafe()
  // Tunggu hydrate selesai: refresh bukan logout — sesi masih dipulihkan dari token.
  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-4xl text-stone">progress_activity</span>
          <p className="text-sm text-stone">Memeriksa sesi…</p>
        </div>
      </div>
    )
  }
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(redirectTo)}`} replace />
  if (roles && !roles.includes(session.user.role)) {
    return <Navigate to={session.user.role === 'owner' ? '/backoffice/dashboard' : '/frontoffice/orders'} replace />
  }
  return children
}

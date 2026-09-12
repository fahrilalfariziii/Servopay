import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { TOKEN_KEY, platformApi, type PlatformAdmin, type PlatformRole } from '../lib/platform-api'

type Ctx = {
  admin: PlatformAdmin | null
  isHydrating: boolean
  login: (email: string, password: string) => Promise<PlatformAdmin>
  logout: () => Promise<void>
}

const PlatformCtx = createContext<Ctx | null>(null)

export function usePlatform(): Ctx {
  const ctx = useContext(PlatformCtx)
  if (!ctx) throw new Error('usePlatform di luar provider')
  return ctx
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null)
  const [isHydrating, setIsHydrating] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setIsHydrating(false)
      return
    }
    platformApi
      .getMe()
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setIsHydrating(false))
  }, [])

  async function login(email: string, password: string): Promise<PlatformAdmin> {
    const res = await platformApi.login(email, password)
    localStorage.setItem(TOKEN_KEY, res.token)
    setAdmin(res.admin)
    return res.admin
  }

  async function logout(): Promise<void> {
    try {
      await platformApi.logout()
    } catch {
      // abaikan — token lokal tetap dibuang
    }
    localStorage.removeItem(TOKEN_KEY)
    setAdmin(null)
  }

  return <PlatformCtx.Provider value={{ admin, isHydrating, login, logout }}>{children}</PlatformCtx.Provider>
}

export function RequirePlatform({ children, roles }: { children: ReactNode; roles?: PlatformRole[] }) {
  const { admin, isHydrating } = usePlatform()
  const location = useLocation()
  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Memeriksa sesi…</p>
      </div>
    )
  }
  if (!admin) return <Navigate to={`/platform/login?next=${encodeURIComponent(location.pathname)}`} replace />
  if (roles && !roles.includes(admin.role)) return <Navigate to="/platform/tenants" replace />
  return <>{children}</>
}

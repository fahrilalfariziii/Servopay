import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCafe } from '../../mock/store'
import type { UserRole } from '../../shared/types'
import { Button, Field } from '../../shared/components/ui'

export function LoginPage() {
  const { login, business } = useCafe()
  const [email, setEmail] = useState('kasir@beanbrew.id')
  const [password, setPassword] = useState('Kasir123!')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = params.get('next') || ''

  function getDefaultByRole(r: UserRole) {
    if (r === 'owner') return '/backoffice/dashboard'
    return '/frontoffice/orders'
  }

  function resolveNext(roleForNext: UserRole, rawNext: string) {
    if (!rawNext) return getDefaultByRole(roleForNext)
    if (roleForNext === 'owner' && rawNext.startsWith('/backoffice')) return rawNext
    if (roleForNext !== 'owner' && rawNext.startsWith('/frontoffice')) return rawNext
    if (roleForNext === 'owner' && rawNext.startsWith('/owner')) return rawNext.replace('/owner', '/backoffice')
    if (roleForNext !== 'owner' && rawNext.startsWith('/pos')) return rawNext.replace('/pos', '/frontoffice')
    return getDefaultByRole(roleForNext)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.')
      return
    }
    const user = login(email.trim(), password)
    if (!user) {
      setError('Email atau password salah. Pastikan akun aktif.')
      return
    }
    navigate(resolveNext(user.role, next))
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-cream px-4">
      <form
        className="w-full max-w-sm rounded-[16px] bg-white p-8 ring-1 ring-[#e4e2dd] shadow-2xs"
        onSubmit={handleSubmit}
      >
        <p className="font-display text-2xl font-semibold">{business.name}</p>
        <p className="mb-6 text-sm text-muted">Masuk dengan email dan password.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-[#ba1a1a]/30 bg-[#ba1a1a]/10 px-3 py-2.5 text-xs font-medium text-[#ba1a1a]">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Field label="Email">
            <input
              className="h-11 w-full rounded-[8px] border border-clay bg-white px-3 text-sm outline-none focus:border-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@beanbrew.id"
              type="email"
              autoComplete="email"
              required
            />
          </Field>

          <Field label="Password">
            <div className="relative">
              <input
                className="h-11 w-full rounded-[8px] border border-clay bg-white px-3 pr-10 text-sm outline-none focus:border-black"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6: huruf, angka, simbol"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-stone hover:bg-sand hover:text-black"
                title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            <p className="mt-1 text-[11px] text-stone">Wajib 8 karakter (huruf + angka + simbol) untuk password baru di Staff.</p>
          </Field>
        </div>

        <Button className="mt-6 w-full" type="submit">
          Masuk
        </Button>

        <div className="mt-4 rounded-lg bg-cream/60 p-3 text-[11px] leading-relaxed text-stone ring-1 ring-sand">
          <p className="font-semibold text-black">Akun demo:</p>
          <p>owner@beanbrew.id / Owner123! (Owner → Back Office)</p>
          <p>kasir@beanbrew.id / Kasir123! (Kasir → Front Office)</p>
          <p>barista@beanbrew.id / Barista123! (Barista → Front Office)</p>
        </div>
      </form>
    </div>
  )
}

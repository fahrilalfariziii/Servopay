import { useEffect, useState } from 'react'
import { platformApi } from '../lib/platform-api'
import { Alert, Button, Field, Input, Select } from './ui'

// Panel geser dari kanan untuk onboarding tenant — pengganti halaman terpisah.
export function TenantCreateSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (businessId: number) => void
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [planCode, setPlanCode] = useState('pro')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = (await platformApi.createTenant({
        name,
        slug,
        ownerName,
        ownerEmail,
        ownerPassword,
        planCode,
      })) as { business: { id: number } }
      onCreated(res.business.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat tenant')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tenant baru">
      <div className="absolute inset-0 bg-slate-950/45" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Tenant Baru</h2>
            <p className="mt-0.5 text-sm text-slate-500">Bisnis + owner + langganan langsung aktif — tanpa trial.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama bisnis">
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Kopi Sore" />
            </Field>
            <Field label="Slug" hint="Huruf kecil + strip, unik.">
              <Input
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="kopi-sore"
                className="font-mono"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama owner">
              <Input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </Field>
            <Field label="Email owner">
              <Input required type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password awal owner">
              <Input
                required
                type="password"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="Min 8: huruf, angka, simbol"
              />
            </Field>
            <Field label="Paket">
              <Select value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </Select>
            </Field>
          </div>
          </div>
          <div className="flex gap-2 border-t border-slate-200 px-5 py-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Batal
            </Button>
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? 'Membuat…' : 'Buat & Aktifkan'}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  )
}

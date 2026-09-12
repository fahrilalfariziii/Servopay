import { useEffect, useState } from 'react'
import { usePlatform } from '../auth/PlatformAuth'
import { platformApi, type PlanRow } from '../lib/platform-api'
import { Alert, Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Skeleton, Textarea } from '../components/ui'

export function PlansPage() {
  const { admin } = usePlatform()
  const isSuper = admin?.role === 'superadmin'
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PlanRow | null>(null)
  const [draft, setDraft] = useState({ name: '', price: '', billingCycle: 'monthly', featureFlags: '', limits: '', isActive: true })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await platformApi.getPlans()
      setPlans(res.plans)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function startEdit(p: PlanRow) {
    setEditing(p)
    setDraft({
      name: p.name,
      price: String(p.price),
      billingCycle: p.billingCycle,
      featureFlags: JSON.stringify(p.featureFlags, null, 2),
      limits: JSON.stringify(p.limits, null, 2),
      isActive: p.isActive,
    })
    setError('')
    setNotice('')
  }

  async function save() {
    if (!editing) return
    setError('')
    setNotice('')
    let featureFlags: Record<string, boolean>
    let limits: Record<string, number | null>
    try {
      featureFlags = JSON.parse(draft.featureFlags) as Record<string, boolean>
      limits = JSON.parse(draft.limits) as Record<string, number | null>
    } catch {
      setError('featureFlags / limits bukan JSON valid')
      return
    }
    try {
      await platformApi.updatePlan(editing.code, {
        name: draft.name,
        price: Number(draft.price),
        billingCycle: draft.billingCycle,
        featureFlags,
        limits,
        isActive: draft.isActive,
      })
      setNotice(`Paket ${editing.code} disimpan — langsung memengaruhi feature gating.`)
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Paket"
        desc={`3 paket tetap. Perubahan langsung memengaruhi gating semua tenant paket tersebut.${isSuper ? '' : ' (role support: read-only)'}`}
      />
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {loading ? (
        <Skeleton lines={5} />
      ) : (
        <div className="grid items-stretch gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.code} className="flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{p.name}</p>
                <Badge status={p.isActive ? 'active' : 'canceled'} />
              </div>
              <p className="tabular mt-2 text-2xl font-bold text-slate-900">
                {Number(p.price) ? `Rp ${Number(p.price).toLocaleString('id-ID')}` : 'Custom'}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-400">
                {p.code} · {p.billingCycle} · {p.tenantCount ?? 0} tenant
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Flags aktif: {Object.entries(p.featureFlags).filter(([, v]) => v).length} · Limits:{' '}
                <span className="font-mono">{JSON.stringify(p.limits)}</span>
              </p>
              {isSuper && (
                <Button size="sm" className="mt-4 w-full" onClick={() => startEdit(p)}>
                  Edit
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {editing && isSuper && (
        <Modal title={`Edit paket ${editing.code}`} desc="Berlaku untuk semua tenant paket ini." onClose={() => setEditing(null)} wide>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nama">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Harga">
              <Input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} inputMode="numeric" />
            </Field>
            <Field label="Siklus">
              <Select value={draft.billingCycle} onChange={(e) => setDraft({ ...draft, billingCycle: e.target.value })}>
                <option value="monthly">monthly</option>
                <option value="yearly">yearly</option>
                <option value="custom">custom</option>
              </Select>
            </Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="featureFlags (JSON)">
              <Textarea value={draft.featureFlags} onChange={(e) => setDraft({ ...draft, featureFlags: e.target.value })} rows={8} spellCheck={false} className="font-mono text-xs" />
            </Field>
            <Field label="limits (JSON, null = tanpa batas)">
              <Textarea value={draft.limits} onChange={(e) => setDraft({ ...draft, limits: e.target.value })} rows={8} spellCheck={false} className="font-mono text-xs" />
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
            Paket aktif
          </label>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => void save()}>
              Simpan
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
              Batal
            </Button>
          </div>
        </Modal>
      )}
    </section>
  )
}

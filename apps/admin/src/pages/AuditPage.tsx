import { useEffect, useState } from 'react'
import { platformApi, type AuditRow } from '../lib/platform-api'
import { Alert, Button, Card, Input, PageHeader, Skeleton } from '../components/ui'

export function AuditPage() {
  const [logs, setLogs] = useState<AuditRow[]>([])
  const [businessId, setBusinessId] = useState('')
  const [action, setAction] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await platformApi.getAuditLogs({
        businessId: businessId ? Number(businessId) : undefined,
        action: action || undefined,
      })
      setLogs(res.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="space-y-4">
      <PageHeader title="Audit Log" desc="Siapa mengubah apa, kapan — untuk aksi sensitif." />
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void load()
          }}
          className="flex flex-wrap gap-2"
        >
          <Input
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            placeholder="ID tenant (opsional)"
            inputMode="numeric"
            className="h-10 w-44"
          />
          <Input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="aksi (mis. plan_changed)"
            className="h-10 w-56"
          />
          <Button type="submit" size="sm" className="h-10">
            Filter
          </Button>
        </form>
      </Card>
      {error && <Alert tone="error">{error}</Alert>}
      {loading ? (
        <Skeleton lines={5} />
      ) : logs.length === 0 ? (
        <Card>
          <p className="py-4 text-center text-sm text-slate-400">Belum ada log.</p>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {logs.map((l) => (
              <li key={l.id} className="py-3 first:pt-0 last:pb-0">
                <button onClick={() => setExpanded(expanded === l.id ? null : l.id)} className="block w-full text-left">
                  <p className="text-sm">
                    <strong className="font-mono text-xs">{l.action}</strong>
                    <span className="text-slate-400"> · {new Date(l.createdAt).toLocaleString('id-ID')}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {l.platformAdmin?.name ?? '?'} · tenant: {l.business?.name ?? '—'}
                  </p>
                </button>
                {expanded === l.id && (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    {JSON.stringify({ before: l.before, after: l.after }, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  )
}

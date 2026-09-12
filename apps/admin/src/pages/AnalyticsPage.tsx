import { useEffect, useState } from 'react'
import { platformApi } from '../lib/platform-api'
import { Alert, Card, PageHeader, Skeleton } from '../components/ui'

type Overview = {
  tenantsPerPlan: { planCode: string | null; count: number }[]
  newTenantsByMonth: { month: string; count: number }[]
  mrr: number
  activeSubscriptions: number
}

export function AnalyticsPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    platformApi
      .getAnalytics()
      .then((res) => setData(res as unknown as Overview))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Gagal memuat'))
  }, [])

  return (
    <section className="space-y-4">
      <PageHeader title="Analitik" desc="Ringkasan kesehatan bisnis platform." />
      {error && <Alert tone="error">{error}</Alert>}
      {!data && !error ? (
        <Skeleton lines={4} />
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Estimasi MRR</p>
              <p className="tabular mt-1 text-2xl font-bold text-slate-900">Rp {Number(data.mrr).toLocaleString('id-ID')}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Langganan aktif</p>
              <p className="tabular mt-1 text-2xl font-bold text-slate-900">{data.activeSubscriptions}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tenant per paket</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {data.tenantsPerPlan.map((r) => (
                  <li key={r.planCode ?? 'none'} className="flex justify-between">
                    <span>{r.planCode ?? '(tanpa paket)'}</span>
                    <strong className="tabular">{r.count}</strong>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <Card>
            <h2 className="text-[15px] font-semibold text-slate-900">Tenant baru per bulan</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {data.newTenantsByMonth.map((r) => (
                <li key={r.month} className="flex max-w-xs justify-between">
                  <span className="font-mono text-xs">{r.month}</span>
                  <strong className="tabular">{r.count}</strong>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </section>
  )
}

export interface SalesBucket {
  label: string
  total: number
  self: number
  manual: number
  count: number
}

function bucketKey(d: Date, period: 'daily' | 'weekly' | 'monthly'): number {
  if (period === 'daily') return Math.floor(d.getHours() / 2)
  if (period === 'weekly') {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    return Math.floor((day - start.getTime()) / 86400000)
  }
  return Math.min(3, Math.floor((d.getDate() - 1) / 7))
}

function bucketLabel(period: 'daily' | 'weekly' | 'monthly', i: number): string {
  if (period === 'daily') return `${String(i * 2).padStart(2, '0')}:00`
  if (period === 'weekly') return ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(Date.now() - (6 - i) * 86400000).getDay()]
  return `M${i + 1}`
}

function bucketCount(period: 'daily' | 'weekly' | 'monthly'): number {
  return period === 'monthly' ? 4 : period === 'weekly' ? 7 : 12
}

function inScope(d: Date, period: 'daily' | 'weekly' | 'monthly', now: Date): boolean {
  if (period === 'daily') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }
  if (period === 'weekly') {
    const diff = now.getTime() - d.getTime()
    return diff >= 0 && diff < 7 * 86400000
  }
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

/** Agregasi omset real dari order paid. Sumber tunggal Dashboard + Omset + Sales Type. */
export function bucketizePaidOrders(orders: { createdAt: string; total: number; source: string }[], period: 'daily' | 'weekly' | 'monthly'): SalesBucket[] {
  const n = bucketCount(period)
  const now = new Date()
  const buckets: SalesBucket[] = Array.from({ length: n }, (_, i) => ({ label: bucketLabel(period, i), total: 0, self: 0, manual: 0, count: 0 }))
  for (const o of orders) {
    const d = new Date(o.createdAt)
    if (isNaN(d.getTime()) || !inScope(d, period, now)) continue
    const k = bucketKey(d, period)
    if (k < 0 || k >= n) continue
    const b = buckets[k]
    b.total += o.total
    b.count += 1
    if (o.source === 'self_order') b.self += o.total
    else b.manual += o.total
  }
  return buckets
}

export function filterPaidOrders<T extends { createdAt: string; paymentStatus: string }>(orders: T[], year: number): T[] {
  return orders.filter((o) => {
    if (o.paymentStatus !== 'paid') return false
    const d = new Date(o.createdAt)
    return !isNaN(d.getTime()) && d.getFullYear() === year
  })
}

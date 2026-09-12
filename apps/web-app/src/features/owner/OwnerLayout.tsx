import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useCafe } from '../../mock/store'
import { OwnerSidebar } from './components/OwnerSidebar'
import { joinSocket } from '../../lib/socket'

export function OwnerLayout() {
  const {
    refreshBusinessFromBackend,
    refreshOrdersFromBackend,
    refreshProductsFromBackend,
    refreshCategoriesFromBackend,
    refreshStaffFromBackend,
    refreshTablesFromBackend,
    refreshIngredientsFromBackend,
  } = useCafe()
  const [loadError, setLoadError] = useState<string | null>(null)

  // Refresh terpusat area owner: semua halaman baca data server, bukan seed.
  // Laporan (dashboard/omset/riwayat) otomatis = transaksi asli.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      refreshBusinessFromBackend(),
      refreshOrdersFromBackend(),
      refreshProductsFromBackend(),
      refreshCategoriesFromBackend(),
      refreshStaffFromBackend(),
      refreshTablesFromBackend(),
      refreshIngredientsFromBackend(),
    ]).catch(() => {
      if (!cancelled) setLoadError('Backend tidak terjangkau — menampilkan data lokal.')
    })
    let cleanup: (() => void) | undefined
    try {
      const token = localStorage.getItem('servopay_token') || undefined
      const s = joinSocket({ token } as unknown as { token?: string })
      const refreshOrders = () => refreshOrdersFromBackend().catch(() => {})
      const refreshProducts = () => {
        refreshProductsFromBackend().catch(() => {})
        refreshCategoriesFromBackend().catch(() => {})
      }
      const refreshStock = () => refreshIngredientsFromBackend().catch(() => {})
      const refreshBiz = () => refreshBusinessFromBackend().catch(() => {})
      s.on('order:new', refreshOrders)
      s.on('order:status_updated', refreshOrders)
      s.on('order:payment_updated', refreshOrders)
      s.on('product:availability_updated', refreshProducts)
      s.on('ingredient:stock_updated', refreshStock)
      s.on('business:cash_updated', refreshBiz)
      s.on('business:updated', refreshBiz)
      cleanup = () => {
        s.off('order:new', refreshOrders)
        s.off('order:status_updated', refreshOrders)
        s.off('order:payment_updated', refreshOrders)
        s.off('product:availability_updated', refreshProducts)
        s.off('ingredient:stock_updated', refreshStock)
        s.off('business:cash_updated', refreshBiz)
        s.off('business:updated', refreshBiz)
      }
    } catch {}
    return () => {
      cancelled = true
      if (cleanup) cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-cream text-black">
      {/* Navbar Samping (Sidebar) Terpisah */}
      <OwnerSidebar />

      {/* Area Konten Utama Halaman Owner */}
      <main className="flex-1 overflow-y-auto p-8">
        {loadError && (
          <p className="mb-4 rounded-[12px] border border-[#ba1a1a]/30 bg-[#ba1a1a]/10 px-4 py-3 text-sm text-[#ba1a1a]">
            {loadError}
          </p>
        )}
        <Outlet />
      </main>
    </div>
  )
}

export function OwnerSettingsPage() {
  return <Outlet />
}
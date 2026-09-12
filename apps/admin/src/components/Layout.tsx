import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { usePlatform } from '../auth/PlatformAuth'

const GROUPS: { label: string; items: { to: string; label: string; icon: string }[] }[] = [
  {
    label: 'Operasional',
    items: [
      { to: '/platform/tenants', label: 'Tenant', icon: 'store' },
      { to: '/platform/leads', label: 'Leads', icon: 'forward_to_inbox' },
    ],
  },
  {
    label: 'Bisnis',
    items: [
      { to: '/platform/plans', label: 'Paket', icon: 'package_2' },
      { to: '/platform/invoices', label: 'Invoice', icon: 'receipt_long' },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { to: '/platform/content', label: 'Konten Landing', icon: 'web' },
      { to: '/platform/analytics', label: 'Analitik', icon: 'monitoring' },
      { to: '/platform/audit', label: 'Audit Log', icon: 'history' },
    ],
  },
]

const TITLES: { prefix: string; title: string }[] = [
  { prefix: '/platform/tenants/', title: 'Detail Tenant' },
  { prefix: '/platform/tenants', title: 'Tenant' },
  { prefix: '/platform/leads', title: 'Leads' },
  { prefix: '/platform/plans', title: 'Paket' },
  { prefix: '/platform/invoices', title: 'Invoice' },
  { prefix: '/platform/content', title: 'Konten Landing' },
  { prefix: '/platform/analytics', title: 'Analitik' },
  { prefix: '/platform/audit', title: 'Audit Log' },
]

export function PlatformLayout() {
  const { admin, logout } = usePlatform()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const title = TITLES.find((t) => location.pathname.startsWith(t.prefix))?.title ?? 'Platform Admin'

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      <div className="px-5 pb-4 pt-6">
        <p className="text-lg font-bold tracking-tight">Ordria</p>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Platform Admin</p>
      </div>
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              {g.label}
            </p>
            <div className="space-y-0.5">
              {g.items.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/platform/tenants'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive ? 'bg-white font-semibold text-slate-900' : 'text-slate-300 hover:bg-white/10'
                    }`
                  }
                >
                  <span className="material-symbols-outlined text-xl">{n.icon}</span>
                  {n.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4 text-xs">
        <p className="font-semibold">{admin?.name}</p>
        <p className="truncate text-slate-400">{admin?.email}</p>
        <p className="mt-1.5 inline-block rounded-full bg-white/10 px-2.5 py-0.5 font-semibold">{admin?.role}</p>
        <button onClick={() => void logout()} className="mt-3 block underline hover:text-slate-300">
          Keluar
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-100">
      {/* Desktop sidebar — bagian dari flow, setinggi viewport, tidak pernah ikut scroll.
          Scroll halaman hanya terjadi di kolom konten (main di bawah). */}
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/45" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-base font-bold text-slate-900">{title}</h1>
          <span className="ml-auto hidden rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white sm:block">
            Internal
          </span>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import { OwnerSidebar } from './components/OwnerSidebar'

export function OwnerLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-cream text-black">
      {/* Navbar Samping (Sidebar) Terpisah */}
      <OwnerSidebar />

      {/* Area Konten Utama Halaman Owner */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}

export function OwnerSettingsPage() {
  return <Outlet />
}
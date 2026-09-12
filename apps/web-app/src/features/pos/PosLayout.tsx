import { Outlet } from 'react-router-dom'
import { PosHeader } from './components/PosHeader'

export function PosLayout() {
  return (
    <div className="flex min-h-full flex-col bg-cream text-black">
      <PosHeader />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
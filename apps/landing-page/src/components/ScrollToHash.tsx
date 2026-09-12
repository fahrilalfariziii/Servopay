import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// BrowserRouter tidak scroll otomatis ke hash lintas-halaman
// (mis. Home → /pos-kafe#pricing). Komponen ini menanganinya.
export function ScrollToHash() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 })
      return
    }
    // Tunggu satu frame agar section tujuan sudah ter-render.
    const raf = window.requestAnimationFrame(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(raf)
  }, [pathname, hash])
  return null
}

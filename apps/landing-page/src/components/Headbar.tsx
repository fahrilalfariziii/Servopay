import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { WEB_APP_URL } from '../lib/api'

export function Headbar() {
  const [scrolled, setScrolled] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  
  const closeTimer = useRef<number | null>(null)
  const headbarRef = useRef<HTMLElement | null>(null)
  const location = useLocation()
  
  const onPos = location.pathname === '/pos-kafe' || location.pathname.startsWith('/pos-kafe/')
  const onJasa = location.pathname === '/jasa-website'
  const onHome = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Tutup dropdown setiap pindah rute.
  useEffect(() => {
    setProductOpen(false)
    setIsPinned(false)
  }, [location.pathname])

  // Click Outside & Escape Key Handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headbarRef.current && !headbarRef.current.contains(e.target as Node)) {
        setProductOpen(false)
        setIsPinned(false)
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProductOpen(false)
        setIsPinned(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', onKey)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  function scheduleClose() {
    if (isPinned) return
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setProductOpen(false), 120)
  }

  function cancelClose() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function handleProductClick() {
    cancelClose()
    if (productOpen && isPinned) {
      setProductOpen(false)
      setIsPinned(false)
    } else {
      setProductOpen(true)
      setIsPinned(true)
    }
  }

  const anchor = (hash: string) => (onPos ? hash : `/pos-kafe${hash}`)

  return (
    <header
      ref={headbarRef}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-surface/85 shadow-[0_1px_12px_rgba(30,19,11,0.08)] backdrop-blur-[16px]'
          : 'bg-surface'
      }`}
    >
      <div className="relative mx-auto flex h-20 max-w-[90rem] items-center justify-between px-4 sm:px-6">
        {/* LOGO UNTUK HEADBAR: Diperbesar dari h-9 menjadi h-12 */}
        <Link to="/" aria-label="Ordria — beranda" className="transition-transform active:scale-95">
          <img src={`${import.meta.env.BASE_URL}Ordria-Icon.svg`} alt="Ordria" className="h-35 w-auto" />
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 text-base text-on-surface-variant md:flex">
          <Link
            to="/"
            className={`transition-colors duration-200 hover:text-on-surface ${location.pathname === '/' ? 'font-semibold text-on-surface' : ''}`}
          >
            Home
          </Link>
          <div
            className="relative"
            onMouseEnter={() => {
              cancelClose()
              setProductOpen(true)
            }}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={productOpen}
              onClick={handleProductClick}
              className={`flex items-center gap-1.5 transition-colors duration-200 hover:text-on-surface ${productOpen ? 'font-semibold text-on-surface' : ''}`}
            >
              Product
              <span
                className="material-symbols-outlined text-[20px] transition-transform duration-300 ease-out"
                style={{ transform: productOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                expand_more
              </span>
            </button>
          </div>
          <a
            href={onHome ? '#faq' : onJasa ? '#faq-jasa' : anchor('#faq')}
            className="transition-colors duration-200 hover:text-on-surface"
          >
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3 sm:gap-5">
          <a
            href={`${WEB_APP_URL}/login`}
            className="hidden text-base text-on-surface-variant transition-colors duration-200 hover:text-on-surface sm:block"
          >
            Sign In
          </a>
          <Link
            to="/hubungi-sales"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-base font-semibold text-on-primary shadow-md transition-all duration-200 hover:bg-primary-container hover:shadow-lg active:scale-95"
          >
            Hubungi Sales
          </Link>
        </div>

        {/* Mega Menu Dropdown */}
        <div
          className={`absolute inset-x-0 top-full z-40 px-4 sm:px-6 transition-all duration-300 ease-out origin-top ${
            productOpen
              ? 'pointer-events-auto opacity-100 translate-y-0 scale-y-100'
              : 'pointer-events-none opacity-0 -translate-y-2 scale-y-95'
          }`}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="overflow-hidden rounded-b-3xl border border-t-0 border-outline-variant/30 bg-surface shadow-[0_16px_40px_rgba(30,19,11,0.14)] backdrop-blur-md">
            {/* Grid Kartu Produk */}
            <div className="grid grid-cols-1 divide-y divide-outline-variant/20 p-4 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:p-5">
              {/* Item 1: POS Kafe */}
              <Link
                to="/pos-kafe"
                onClick={() => {
                  setProductOpen(false)
                  setIsPinned(false)
                }}
                className="group flex items-start gap-5 rounded-2xl p-4 transition-all duration-200 hover:bg-surface-container-low hover:shadow-sm"
              >
                {/* KOTAK IKON DIPERBESAR: h-14 w-14, Ukuran Font Material Icon: 32px */}
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-sm transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-3">
                  <span className="material-symbols-outlined text-[32px] text-on-primary">point_of_sale</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-on-surface transition-colors duration-200 group-hover:text-primary">
                      POS Kafe
                    </span>
                    {onPos ? (
                      <span className="rounded-full bg-secondary-fixed px-2.5 py-0.5 text-[10px] font-bold text-on-secondary-fixed">
                        Anda di sini
                      </span>
                    ) : (
                      <span className="rounded-full bg-primary-container/60 px-2.5 py-0.5 text-[10px] font-semibold text-on-primary-container">
                        SaaS
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                    Sistem kasir otomatis, manajemen stok bahan, dan QR Self-Order dalam satu platform.
                  </p>
                </div>
                <span className="material-symbols-outlined shrink-0 text-[22px] text-on-surface-variant transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-hover:text-primary">
                  arrow_forward
                </span>
              </Link>

              {/* Item 2: Jasa Website */}
              <Link
                to="/jasa-website"
                onClick={() => {
                  setProductOpen(false)
                  setIsPinned(false)
                }}
                className="group flex items-start gap-5 rounded-2xl p-4 transition-all duration-200 hover:bg-surface-container-low hover:shadow-sm"
              >
                {/* KOTAK IKON DIPERBESAR: h-14 w-14, Ukuran Font Material Icon: 32px */}
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-fixed shadow-sm transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3">
                  <span className="material-symbols-outlined text-[32px] text-on-secondary-fixed">language</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-on-surface transition-colors duration-200 group-hover:text-primary">
                      Jasa Website Custom
                    </span>
                    {onJasa && (
                      <span className="rounded-full bg-secondary-fixed px-2.5 py-0.5 text-[10px] font-bold text-on-secondary-fixed">
                        Anda di sini
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                    Pembuatan landing page &amp; website profesional terintegrasi khusus untuk bisnis Anda.
                  </p>
                </div>
                <span className="material-symbols-outlined shrink-0 text-[22px] text-on-surface-variant transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-hover:text-primary">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
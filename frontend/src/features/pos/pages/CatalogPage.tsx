import { useState } from 'react'
import { useCafe } from '../../../mock/store'
import type { Product } from '../../../shared/types'
import { Button } from '../../../shared/components/ui'

export function CatalogPage() {
  const { products, categories, toggleProductAvailability } = useCafe()
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const [selectedProductToToggle, setSelectedProductToToggle] = useState<Product | null>(null)

  const tabs = ['All', ...categories.map((c) => c.name)]

  const filtered = products.filter((p) => {
    const name = categories.find((c) => c.id === p.categoryId)?.name
    return (cat === 'All' || name === cat) && p.name.toLowerCase().includes(q.toLowerCase())
  })

  function handleConfirmToggle() {
    if (selectedProductToToggle) {
      toggleProductAvailability(selectedProductToToggle.id)
      setSelectedProductToToggle(null)
    }
  }

  return (
    <div>
      <h1 className="font-display text-[40px] font-semibold tracking-tight">Menu Availability</h1>
      <p className="mb-6 text-stone">Kelola ketersediaan item dan status katalog secara real-time.</p>

      {/* Baris Navigasi: Kategori (Kiri) & Search (Kanan, Sejajar) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* Sisi Kiri: Tab Kategori */}
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setCat(t)}
              className={`h-[33px] rounded-[12px] px-4 text-xs font-semibold tracking-wider transition-colors ${
                t === cat ? 'bg-black text-white' : 'bg-sand text-stone hover:bg-[#e6e2d9] hover:text-black'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Sisi Kanan: Input Search (Terpisah & Sejajar) */}
        <div className="relative min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-stone">
            search
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari menu..."
            className="h-[34px] w-full rounded-[12px] border border-[#c4c7c7] bg-[#f7f3ea] pl-9 pr-4 text-sm outline-none focus:border-black transition-colors"
          />
        </div>
      </div>

      {/* Grid Katalog Produk */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {filtered.map((p) => (
          <article key={p.id} className="flex gap-4 rounded-[12px] border border-[#c4c7c7] bg-cream p-4 items-center">
            <img src={p.imageUrl} alt="" className="size-20 rounded-lg object-cover" />

            <div className="flex flex-1 items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-black leading-snug">{p.name}</p>
                <p className="text-xs text-muted mt-0.5">{categories.find((c) => c.id === p.categoryId)?.name}</p>
                <span
                  className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    p.isAvailable ? 'bg-[#b8cda9]/50 text-sage' : 'bg-[#ba1a1a]/15 text-[#ba1a1a]'
                  }`}
                >
                  {p.isAvailable ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              {/* TOGGLE SWITCH COMPONENT */}
              <button
                type="button"
                role="switch"
                aria-checked={p.isAvailable}
                onClick={() => setSelectedProductToToggle(p)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  p.isAvailable ? 'bg-sage' : 'bg-clay/60'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    p.isAvailable ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* POPUP MODAL KONFIRMASI STATUS */}
      {selectedProductToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[16px] bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <span className={`material-symbols-outlined text-2xl ${
                selectedProductToToggle.isAvailable ? 'text-[#ba1a1a]' : 'text-sage'
              }`}>
                {selectedProductToToggle.isAvailable ? 'warning' : 'check_circle'}
              </span>
              <h3 className="font-semibold text-black text-base">Ubah Status Menu?</h3>
            </div>

            <p className="text-sm text-stone mb-6">
              Apakah Anda yakin ingin mengubah status ketersediaan{' '}
              <strong className="text-black">&quot;{selectedProductToToggle.name}&quot;</strong> menjadi{' '}
              <strong className={selectedProductToToggle.isAvailable ? 'text-[#ba1a1a]' : 'text-sage'}>
                {selectedProductToToggle.isAvailable ? 'Out of Stock' : 'In Stock'}
              </strong>?
            </p>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedProductToToggle(null)}
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmToggle}
                className={selectedProductToToggle.isAvailable ? 'bg-[#ba1a1a] hover:bg-[#ba1a1a]/90 text-white' : ''}
              >
                Ya, Ubah
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
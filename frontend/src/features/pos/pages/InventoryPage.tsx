import { useState } from 'react'
import { useCafe } from '../../../mock/store'
import { uid } from '../../../shared/lib/format'
import type { Ingredient, StockMovementType } from '../../../shared/types'
import { Button, Field, TextInput } from '../../../shared/components/ui'

export function InventoryPage() {
  const { ingredients, movements, upsertIngredient, removeIngredient, recordStock } = useCafe()

  // State Search Filter
  const [searchQuery, setSearchQuery] = useState('')

  // State Modal Form Bahan (Tambah & Edit)
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false)
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null)
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    unit: 'kg',
    currentStock: '0',
    minimumStock: '0',
  })

  // State Modal Receive Stock / Adjustment
  const [isStockModalOpen, setIsStockModalOpen] = useState(false)
  const [stockForm, setStockForm] = useState({
    ingredientId: ingredients[0]?.id ?? '',
    type: 'in' as StockMovementType,
    quantity: '1',
    notes: '',
  })

  // State Modal Konfirmasi Hapus
  const [deletingIngredient, setDeletingIngredient] = useState<Ingredient | null>(null)

  // Filter Bahan berdasarkan Search Query
  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Buka Modal Tambah Bahan Baru
  function handleOpenAddModal() {
    setEditingIngredientId(null)
    setIngredientForm({ name: '', unit: 'kg', currentStock: '0', minimumStock: '0' })
    setIsIngredientModalOpen(true)
  }

  // Buka Modal Edit Bahan
  function handleOpenEditModal(item: Ingredient) {
    setEditingIngredientId(item.id)
    setIngredientForm({
      name: item.name,
      unit: item.unit,
      currentStock: String(item.currentStock),
      minimumStock: String(item.minimumStock),
    })
    setIsIngredientModalOpen(true)
  }

  // Simpan/Update Bahan
  function saveIngredient() {
    const item: Ingredient = {
      id: editingIngredientId || uid('ing'),
      name: ingredientForm.name,
      unit: ingredientForm.unit,
      currentStock: Number(ingredientForm.currentStock),
      minimumStock: Number(ingredientForm.minimumStock),
      isAvailable: Number(ingredientForm.currentStock) > 0,
    }
    upsertIngredient(item)
    setIsIngredientModalOpen(false)
  }

  // Simpan Pergerakan Stok
  function handleRecordStock() {
    recordStock(
      stockForm.ingredientId || ingredients[0]?.id || '',
      stockForm.type,
      Number(stockForm.quantity),
      stockForm.notes || 'Manual'
    )
    setIsStockModalOpen(false)
    setStockForm({
      ingredientId: ingredients[0]?.id ?? '',
      type: 'in',
      quantity: '1',
      notes: '',
    })
  }

  return (
    <div>
      {/* Header Utama & Tombol Aksi Stok */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[40px] font-semibold tracking-tight">Inventory</h1>
          <p className="text-stone">Manajemen bahan, stok masuk, dan penyesuaian.</p>
        </div>

        <Button
          onClick={() => setIsStockModalOpen(true)}
          className="flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
          <span>Receive Stock / Adjustment</span>
        </Button>
      </div>

      {/* Grid Utama Layout: Kolom Kiri (Tabel) & Kolom Kanan (Stock History) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
        {/* Kolom Kiri: Baris Search, Tombol Tambah, dan Tabel */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-lg text-black">Daftar Bahan</h2>

            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[200px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-stone">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari bahan..."
                  className="h-10 w-full rounded-[12px] border border-clay/60 bg-white pl-9 pr-3 text-sm outline-none focus:border-black transition-colors"
                />
              </div>

              {/* Tombol Tambah Bahan */}
              <Button onClick={handleOpenAddModal} className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Tambah Bahan</span>
              </Button>
            </div>
          </div>

          {/* Tabel Inventaris Bahan */}
          <div className="overflow-hidden rounded-[12px] border border-[#c4c7c7] bg-white shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f7f3ea] text-[12px] uppercase tracking-wider text-muted border-b border-sand">
                <tr>
                  <th className="px-4 py-3">Ingredient</th>
                  <th className="px-4 py-3">Current</th>
                  <th className="px-4 py-3">Minimum</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredIngredients.map((i) => {
                  const low = i.currentStock <= i.minimumStock
                  const oos = !i.isAvailable || i.currentStock <= 0
                  return (
                    <tr key={i.id} className="border-t border-sand hover:bg-cream/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-black">{i.name}</td>
                      <td className="px-4 py-3 font-semibold">{i.currentStock}</td>
                      <td className="px-4 py-3 text-stone">{i.minimumStock}</td>
                      <td className="px-4 py-3 text-stone">{i.unit}</td>
                      <td className="px-4 py-3 font-semibold">
                        {oos ? (
                          <span className="text-[#ba1a1a]">Out of Stock</span>
                        ) : low ? (
                          <span className="text-[#9a6b2f]">Low Stock</span>
                        ) : (
                          <span className="text-sage">OK</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(i)}
                            className="flex size-8 items-center justify-center rounded-lg border border-clay/60 bg-white text-stone hover:border-black hover:text-black transition-colors"
                            title="Edit Bahan"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => setDeletingIngredient(i)}
                            className="flex size-8 items-center justify-center rounded-lg border border-[#ba1a1a]/30 bg-white text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors"
                            title="Hapus Bahan"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filteredIngredients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted">
                      Bahan tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kolom Kanan: Panel Stock History (Sejajar di Samping Tabel) */}
        <aside className="flex flex-col rounded-[12px] border border-[#c4c7c7] bg-cream p-5 h-fit">
          <div className="mb-4 flex items-center justify-between border-b border-sand pb-3">
            <h3 className="font-semibold text-black text-sm uppercase tracking-wider">Stock History</h3>
            <span className="material-symbols-outlined text-stone text-[20px]">history</span>
          </div>

          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto space-y-3 pr-1">
            {movements.map((m) => (
              <div key={m.id} className="rounded-lg border border-sand bg-white p-3 text-xs shadow-2xs">
                <div className="flex items-center justify-between font-bold text-black">
                  <span className="uppercase text-stone">{m.type}</span>
                  <span className="font-mono">{m.stockBefore} → {m.stockAfter}</span>
                </div>
                <p className="mt-1 font-semibold text-black">Qty: {m.quantity}</p>
                <p className="mt-0.5 text-[11px] text-muted">{m.notes}</p>
              </div>
            ))}

            {movements.length === 0 && (
              <p className="py-8 text-center text-xs text-muted">
                Belum ada riwayat pergerakan stok.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* POPUP MODALS (Sama Seperti Sebelumnya) */}
      {isIngredientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <h3 className="font-semibold text-black">
                {editingIngredientId ? 'Edit Bahan' : 'Tambah Bahan Baru'}
              </h3>
              <button onClick={() => setIsIngredientModalOpen(false)} className="font-bold text-stone">
                ✕
              </button>
            </div>

            <div className="my-4 space-y-3">
              <Field label="Nama Bahan">
                <TextInput
                  value={ingredientForm.name}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                  placeholder="Contoh: Biji Kopi Arabika"
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Satuan">
                  <TextInput
                    value={ingredientForm.unit}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                    placeholder="kg / gr / ml"
                  />
                </Field>
                <Field label="Stok Saat Ini">
                  <TextInput
                    type="number"
                    value={ingredientForm.currentStock}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, currentStock: e.target.value })}
                  />
                </Field>
                <Field label="Stok Minimum">
                  <TextInput
                    type="number"
                    value={ingredientForm.minimumStock}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, minimumStock: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <div className="flex gap-2 border-t border-sand pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsIngredientModalOpen(false)}>
                Batal
              </Button>
              <Button className="flex-1" disabled={!ingredientForm.name} onClick={saveIngredient}>
                Simpan Bahan
              </Button>
            </div>
          </div>
        </div>
      )}

      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <h3 className="font-semibold text-black">Receive Stock / Adjustment</h3>
              <button onClick={() => setIsStockModalOpen(false)} className="font-bold text-stone">
                ✕
              </button>
            </div>

            <div className="my-4 space-y-3">
              <Field label="Pilih Bahan">
                <select
                  className="h-12 w-full rounded-[8px] border border-clay bg-white px-3 outline-none focus:border-black"
                  value={stockForm.ingredientId}
                  onChange={(e) => setStockForm({ ...stockForm, ingredientId: e.target.value })}
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Stok: {i.currentStock} {i.unit})
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipe Pergerakan">
                  <select
                    className="h-12 w-full rounded-[8px] border border-clay bg-white px-3 outline-none focus:border-black"
                    value={stockForm.type}
                    onChange={(e) => setStockForm({ ...stockForm, type: e.target.value as StockMovementType })}
                  >
                    <option value="in">Masuk (In)</option>
                    <option value="out">Keluar (Out)</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="waste">Waste</option>
                  </select>
                </Field>

                <Field label="Jumlah (Qty)">
                  <TextInput
                    type="number"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Catatan">
                <TextInput
                  value={stockForm.notes}
                  onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                  placeholder="Contoh: Pembelian Restock / Bahan Rusak"
                />
              </Field>
            </div>

            <div className="flex gap-2 border-t border-sand pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsStockModalOpen(false)}>
                Batal
              </Button>
              <Button className="flex-1" onClick={handleRecordStock}>
                Catat Pergerakan
              </Button>
            </div>
          </div>
        </div>
      )}

      {deletingIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[16px] bg-white p-6 shadow-2xl">
            <h3 className="font-semibold text-black text-base mb-2">Hapus Bahan?</h3>
            <p className="text-sm text-stone mb-6">
              Apakah Anda yakin ingin menghapus bahan <strong className="text-black">&quot;{deletingIngredient.name}&quot;</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeletingIngredient(null)}>
                Batal
              </Button>
              <Button
                className="bg-[#ba1a1a] hover:bg-[#ba1a1a]/90 text-white"
                onClick={() => {
                  if (deletingIngredient) removeIngredient(deletingIngredient.id)
                  setDeletingIngredient(null)
                }}
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
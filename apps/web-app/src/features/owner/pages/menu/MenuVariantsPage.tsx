import { useState } from 'react'
import { useCafe } from '../../../../mock/store'
import { formatRupiah, uid } from '../../../../shared/lib/format'
import type { ProductOption } from '../../../../shared/types'
import { Button, Field, TextInput } from '../../../../shared/components/ui'

export function MenuVariantsPage() {
  const { products, saveProductOptions } = useCafe()
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id ?? '')
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)

  function showToast(msg: string, kind: 'success' | 'error') {
    setToast({ msg, kind })
    window.setTimeout(() => setToast(null), kind === 'error' ? 4000 : 2500)
  }

  // State Modal Form (Tambah / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null)
  const [optionForm, setOptionForm] = useState({
    type: 'Size',
    name: '',
    price: '0',
    isRequired: false,
  })

  // State Modal Konfirmasi Hapus
  const [deletingOption, setDeletingOption] = useState<ProductOption | null>(null)

  const currentProduct = products.find((p) => p.id === selectedProductId)

  // Buka Modal untuk Tambah Baru
  function handleOpenAddModal() {
    setEditingOption(null)
    setOptionForm({ type: 'Size', name: '', price: '0', isRequired: false })
    setIsFormOpen(true)
  }

  // Buka Modal untuk Edit
  function handleOpenEditModal(opt: ProductOption) {
    setEditingOption(opt)
    setOptionForm({
      type: opt.type,
      name: opt.name,
      price: String(opt.price),
      isRequired: opt.isRequired ?? false,
    })
    setIsFormOpen(true)
  }

  // Simpan Varian (Tambah Baru atau Update) — via endpoint options produk (BE)
  async function handleSaveOption() {
    if (!currentProduct || !optionForm.name.trim() || saving) return
    setSaving(true)
    try {
      const next = editingOption
        ? currentProduct.options.map((o) =>
          o.id === editingOption.id
            ? { ...o, type: optionForm.type.trim(), name: optionForm.name.trim(), price: Number(optionForm.price) || 0, isRequired: optionForm.isRequired }
            : o,
        )
        : [
          ...currentProduct.options,
          {
            id: uid('opt'),
            type: optionForm.type.trim(),
            name: optionForm.name.trim(),
            price: Number(optionForm.price) || 0,
            isRequired: optionForm.isRequired,
          },
        ]
      await saveProductOptions(
        currentProduct.id,
        next.map((o) => ({ name: o.name, type: o.type, price: o.price, isRequired: o.isRequired })),
      )
      setIsFormOpen(false)
      showToast('Varian tersimpan di server!', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan varian', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Eksekusi Hapus Varian (via BE)
  async function handleConfirmDelete() {
    if (!currentProduct || !deletingOption || saving) return
    setSaving(true)
    try {
      const next = currentProduct.options.filter((o) => o.id !== deletingOption.id)
      await saveProductOptions(
        currentProduct.id,
        next.map((o) => ({ name: o.name, type: o.type, price: o.price, isRequired: o.isRequired })),
      )
      setDeletingOption(null)
      showToast('Varian dihapus dari server.', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus varian', 'error')
      setDeletingOption(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Utama & Tombol Tambah */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] font-semibold tracking-tight">Varian & Addons</h1>
          <p className="text-stone">Atur opsi variasi item (seperti ukuran, level gula) dan harga opsionalnya.</p>
        </div>

        <Button onClick={handleOpenAddModal} disabled={!currentProduct} className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Tambah Varian / Addon</span>
        </Button>
      </div>

      {toast && (
        <div
          className={`rounded-[12px] px-4 py-3 text-sm font-medium ${
            toast.kind === 'error'
              ? 'border border-[#ba1a1a]/30 bg-[#ba1a1a]/10 text-[#ba1a1a]'
              : 'border border-sage/40 bg-[#b8cda9]/30 text-sage'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Filter Menu Selector */}
      <div className="rounded-[12px] border border-[#c4c7c7] bg-white p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-stone">restaurant_menu</span>
          <span className="text-sm font-bold text-black">Pilih Menu:</span>
        </div>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="h-10 min-w-[240px] rounded-lg border border-clay bg-white px-3 text-sm font-semibold outline-none focus:border-black"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({formatRupiah(p.price)})
            </option>
          ))}
        </select>
      </div>

      {/* Tampilan Daftar Varian */}
      <div className="rounded-[12px] border border-[#c4c7c7] bg-white p-6 shadow-2xs">
        <div className="border-b border-sand pb-4 mb-6 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-black text-xl">{currentProduct?.name}</h2>
            <p className="text-xs text-stone">Daftar opsi varian dan add-ons yang terkonfigurasi.</p>
          </div>
          <span className="font-bold text-sage bg-[#b8cda9]/30 px-3 py-1 rounded-full text-xs">
            Harga Dasar: {formatRupiah(currentProduct?.price || 0)}
          </span>
        </div>

        {currentProduct?.options && currentProduct.options.length > 0 ? (
          <div className="space-y-6">
            {Array.from(new Set(currentProduct.options.map((o) => o.type))).map((type) => (
              <div key={type} className="rounded-xl border border-sand bg-cream/40 p-5">
                <div className="mb-3 flex items-center justify-between border-b border-sand pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone">{type}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentProduct.options
                    .filter((o) => o.type === type)
                    .map((opt) => (
                      <div
                        key={opt.id}
                        className="flex items-center justify-between rounded-lg bg-white p-3 border border-clay/40 shadow-2xs"
                      >
                        <div>
                          <p className="font-bold text-black text-sm">{opt.name}</p>
                          <p className="text-xs font-semibold text-stone">
                            {opt.price > 0 ? `+${formatRupiah(opt.price)}` : 'Gratis / Tanpa Tambahan'}
                          </p>
                        </div>

                        {/* Tombol Aksi Edit & Hapus */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(opt)}
                            className="flex size-8 items-center justify-center rounded-lg border border-clay/60 bg-white text-stone hover:border-black hover:text-black transition-colors"
                            title="Edit Varian"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => setDeletingOption(opt)}
                            className="flex size-8 items-center justify-center rounded-lg border border-[#ba1a1a]/30 bg-white text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors"
                            title="Hapus Varian"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-stone border border-dashed border-clay/60 rounded-xl">
            Belum ada varian atau add-ons untuk menu ini. Klik tombol di atas untuk menambahkan.
          </div>
        )}
      </div>

      {/* MODAL POPUP FORM (TAMBAH / EDIT VARIAN) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <h3 className="font-bold text-black text-base">
                {editingOption ? 'Edit Varian / Addon' : 'Tambah Varian / Addon Baru'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="font-bold text-stone">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Tipe Varian / Group">
                <TextInput
                  value={optionForm.type}
                  onChange={(e) => setOptionForm({ ...optionForm, type: e.target.value })}
                  placeholder="Contoh: Size / Level Gula / Topping"
                />
              </Field>

              <Field label="Nama Pilihan / Opsi">
                <TextInput
                  value={optionForm.name}
                  onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                  placeholder="Contoh: Large / Less Sugar / Extra Shot"
                  autoFocus
                />
              </Field>

              <Field label="Tambahan Harga (IDR)">
                <TextInput
                  type="number"
                  value={optionForm.price}
                  onChange={(e) => setOptionForm({ ...optionForm, price: e.target.value })}
                  placeholder="0 jika tanpa biaya tambahan"
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-sand pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>
                Batal
              </Button>
              <Button className="flex-1" disabled={!optionForm.name.trim() || saving} onClick={handleSaveOption}>
                {saving ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deletingOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[16px] bg-white p-6 shadow-2xl">
            <h3 className="font-semibold text-black text-base mb-2">Hapus Varian?</h3>
            <p className="text-sm text-stone mb-6">
              Apakah Anda yakin ingin menghapus varian <strong className="text-black">&quot;{deletingOption.name}&quot;</strong> dari menu {currentProduct?.name}?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeletingOption(null)}>
                Batal
              </Button>
              <Button
                className="bg-[#ba1a1a] hover:bg-[#ba1a1a]/90 text-white"
                disabled={saving}
                onClick={handleConfirmDelete}
              >
                {saving ? 'Menghapus…' : 'Hapus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
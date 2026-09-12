import { useState } from 'react'
import { useCafe } from '../../../../mock/store'
import { uid } from '../../../../shared/lib/format'
import type { Category } from '../../../../shared/types'
import { Button, Field, TextInput } from '../../../../shared/components/ui'

export function MenuCategoriesPage() {
  const { categories, products, upsertCategory, removeCategory } = useCafe()

  // State Modal Tambah/Edit Kategori
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryName, setCategoryName] = useState('')

  // State Modal Hapus Kategori
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)

  function showToast(msg: string, kind: 'success' | 'error') {
    setToast({ msg, kind })
    window.setTimeout(() => setToast(null), kind === 'error' ? 4000 : 2500)
  }

  // Buka modal untuk tambah kategori baru
  function handleOpenAddModal() {
    setEditingCategory(null)
    setCategoryName('')
    setIsModalOpen(true)
  }

  // Buka modal untuk edit kategori
  function handleOpenEditModal(cat: Category) {
    setEditingCategory(cat)
    setCategoryName(cat.name)
    setIsModalOpen(true)
  }

  // Simpan / Update Kategori (BE dulu, gagal -> toast, modal tetap terbuka)
  async function handleSaveCategory() {
    if (!categoryName.trim() || saving) return
    setSaving(true)
    try {
      const categoryItem: Category = {
        id: editingCategory?.id || uid('cat'),
        name: categoryName.trim(),
        sortOrder: editingCategory?.sortOrder ?? categories.length + 1,
      }
      await upsertCategory(categoryItem, !editingCategory)
      setIsModalOpen(false)
      setCategoryName('')
      showToast(editingCategory ? 'Kategori tersimpan di server!' : 'Kategori baru tersimpan di server!', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan kategori', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCategory() {
    if (!deletingCategory || saving) return
    const used = products.filter((p) => p.categoryId === deletingCategory.id).length
    if (used > 0) {
      showToast(`Kategori dipakai ${used} menu — pindahkan/hapus menunya dulu.`, 'error')
      setDeletingCategory(null)
      return
    }
    setSaving(true)
    try {
      await removeCategory(deletingCategory.id)
      setDeletingCategory(null)
      showToast('Kategori dihapus dari server.', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus kategori', 'error')
      setDeletingCategory(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Utama */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[32px] font-semibold tracking-tight">Kategori Menu</h1>
          <p className="text-stone">Kelola pengelompokan menu (seperti Espresso, Non-Coffee, Pastry, dll).</p>
        </div>
        <Button onClick={handleOpenAddModal} className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Tambah Kategori</span>
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

      {/* Grid Daftar Kategori */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          // Hitung berapa banyak produk dalam kategori ini
          const itemCount = products.filter((p) => p.categoryId === cat.id).length

          return (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-[12px] border border-[#c4c7c7] bg-white p-5 shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-sand text-black font-bold">
                  <span className="material-symbols-outlined text-[20px]">category</span>
                </div>
                <div>
                  <h3 className="font-bold text-black text-base">{cat.name}</h3>
                  <p className="text-xs text-stone">{itemCount} Menu Terkait</p>
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEditModal(cat)}
                  className="flex size-8 items-center justify-center rounded-lg border border-clay/60 bg-white text-stone hover:border-black hover:text-black transition-colors"
                  title="Edit Kategori"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <button
                  onClick={() => setDeletingCategory(cat)}
                  className="flex size-8 items-center justify-center rounded-lg border border-[#ba1a1a]/30 bg-white text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors"
                  title="Hapus Kategori"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>
          )
        })}

        {categories.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-stone border border-dashed border-clay/60 rounded-lg">
            Belum ada kategori yang dibuat.
          </div>
        )}
      </div>

      {/* MODAL TAMBAH / EDIT KATEGORI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[16px] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-sand pb-3 mb-4">
              <h3 className="font-bold text-black">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="font-bold text-stone">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Nama Kategori">
                <TextInput
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Contoh: Non-Coffee / Snack"
                  autoFocus
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-sand pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button className="flex-1" disabled={!categoryName.trim() || saving} onClick={handleSaveCategory}>
                {saving ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[16px] bg-white p-6 shadow-2xl">
            <h3 className="font-semibold text-black text-base mb-2">Hapus Kategori?</h3>
            <p className="text-sm text-stone mb-6">
              Apakah Anda yakin ingin menghapus kategori <strong className="text-black">&quot;{deletingCategory.name}&quot;</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeletingCategory(null)}>
                Batal
              </Button>
              <Button
                className="bg-[#ba1a1a] hover:bg-[#ba1a1a]/90 text-white"
                disabled={saving}
                onClick={handleDeleteCategory}
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
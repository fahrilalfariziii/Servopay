import { useRef, useState } from 'react'
import { useCafe } from '../../../../mock/store'
import { formatRupiah, uid } from '../../../../shared/lib/format'
import { api, withReloginHint } from '../../../../lib/api'
import { processUploadImage } from '../../../../shared/lib/image'
import type { Product, ProductOption } from '../../../../shared/types'
import { Button, Field, TextInput } from '../../../../shared/components/ui'

const ALL_VARIANTS: ProductOption[] = [
  { id: 't-hot', name: 'Hot', type: 'temperature', price: 0, isRequired: true },
  { id: 't-iced', name: 'Iced', type: 'temperature', price: 0, isRequired: true },
  { id: 's-normal', name: 'Normal', type: 'sugar', price: 0, isRequired: true },
  { id: 's-less', name: 'Less Sugar', type: 'sugar', price: 0, isRequired: true },
  { id: 's-no', name: 'No Sugar', type: 'sugar', price: 0, isRequired: true },
  { id: 'i-normal', name: 'Normal', type: 'ice', price: 0, isRequired: true },
  { id: 'i-less', name: 'Less Ice', type: 'ice', price: 0, isRequired: true },
  { id: 'i-no', name: 'No Ice', type: 'ice', price: 0, isRequired: true },
  { id: 'm-reg', name: 'Regular', type: 'milk', price: 0, isRequired: false },
  { id: 'm-oat', name: 'Oat', type: 'milk', price: 5000, isRequired: false },
  { id: 'm-soy', name: 'Soy', type: 'milk', price: 3000, isRequired: false },
  { id: 'a-shot', name: 'Extra Espresso', type: 'addon', price: 5000, isRequired: false },
  { id: 'a-vanilla', name: 'Vanilla Syrup', type: 'addon', price: 5000, isRequired: false },
]

export function MenuCatalogPage() {
  const { products, categories, upsertProduct, saveProductOptions, removeProduct } = useCafe()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Product | null>(null)
  const [isNewDraft, setIsNewDraft] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  function showToast(msg: string, kind: 'success' | 'error') {
    setToast({ msg, kind })
    window.setTimeout(() => setToast(null), kind === 'error' ? 4000 : 2500)
  }

  function startNew() {
    setDraft({
      id: uid('p'),
      categoryId: categories[0]?.id ?? '',
      name: '',
      description: '',
      price: 0,
      hpp: undefined,
      imageUrl: products[0]?.imageUrl ?? '',
      isAvailable: true,
      options: [],
    })
    setIsNewDraft(true)
    setOpen(true)
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError('')
    const file = e.target.files?.[0]
    if (!file) return
    try {
      // jpg/jpeg/png/heic (iPhone) -> JPEG terkompresi, selalu tampil & muat batas
      const url = await processUploadImage(file)
      setDraft((prev) => (prev ? { ...prev, imageUrl: url } : prev))
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Gagal memproses foto.')
    } finally {
      e.target.value = ''
    }
  }

  function handleRemovePhoto() {
    setDraft((prev) => (prev ? { ...prev, imageUrl: '' } : prev))
    setPhotoError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmitDraft(e: React.FormEvent) {
    e.preventDefault()
    if (!draft || saving) return
    if (!draft.name.trim()) {
      showToast('Nama menu wajib diisi.', 'error')
      return
    }
    // Guard ID basi/NaN sebelum kirim: NaN terserialisasi jadi null -> 400 misterius.
    // Kasus nyata: kategori seed ("c-sig") bila daftar BE belum ter-load.
    const categoryBeId = api.toBackendId(draft.categoryId)
    if (!draft.categoryId || !Number.isFinite(categoryBeId) || categoryBeId <= 0) {
      showToast('Kategori belum tersinkron dari server — tutup drawer, tunggu daftar kategori termuat, lalu coba lagi.', 'error')
      return
    }
    if (!Number.isFinite(draft.price) || draft.price < 0) {
      showToast('Harga harus angka ≥ 0.', 'error')
      return
    }
    if (draft.hpp !== undefined && (!Number.isFinite(draft.hpp) || draft.hpp < 0)) {
      showToast('HPP harus angka ≥ 0 (atau kosongkan).', 'error')
      return
    }
    setSaving(true)
    try {
      const feId = await upsertProduct({ ...draft, name: draft.name.trim() }, isNewDraft)
      await saveProductOptions(
        feId,
        draft.options.map((o) => ({ name: o.name, type: o.type, price: o.price, isRequired: o.isRequired })),
      )
      setOpen(false)
      showToast(isNewDraft ? 'Menu baru tersimpan di server!' : 'Menu tersimpan di server!', 'success')
    } catch (err) {
      showToast(withReloginHint(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteProduct() {
    if (!deletingProduct || saving) return
    setSaving(true)
    try {
      await removeProduct(deletingProduct.id)
      setDeletingProduct(null)
      showToast('Menu dihapus dari server.', 'success')
    } catch (e) {
      showToast(withReloginHint(e), 'error')
      setDeletingProduct(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[32px] font-semibold tracking-tight">Katalog Menu</h1>
          <p className="text-stone">Kelola daftar produk, deskripsi, harga dasar, dan ketersediaan.</p>
        </div>
        <Button onClick={startNew} className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Tambah Menu Baru</span>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {products.map((p) => (
          <article key={p.id} className="overflow-hidden rounded-[12px] border border-[#c4c7c7] bg-white shadow-2xs">
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" className="h-40 w-full object-cover" />
            ) : (
              <div className="flex h-40 w-full items-center justify-center bg-sand font-display text-4xl text-stone">
                {(p.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="font-bold text-black">{p.name}</p>
                  <p className="text-xs text-stone">{categories.find((c) => c.id === p.categoryId)?.name}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  p.isAvailable ? 'bg-[#b8cda9]/40 text-sage' : 'bg-[#ba1a1a]/10 text-[#ba1a1a]'
                }`}>
                  {p.isAvailable ? 'Available' : 'Out of Stock'}
                </span>
              </div>
              <p className="mb-4 line-clamp-2 text-xs text-stone">{p.description || 'Tidak ada deskripsi.'}</p>
              
              <div className="flex items-center justify-between border-t border-sand pt-3">
                <span className="font-bold text-black text-sm">{formatRupiah(p.price)}</span>
                <div className="flex gap-2">
                  <button
                    className="flex size-8 items-center justify-center rounded-lg border border-clay/60 bg-white text-stone hover:border-black hover:text-black transition-colors"
                    onClick={() => {
                      setDraft(p)
                      setIsNewDraft(false)
                      setOpen(true)
                    }}
                    title="Edit Menu"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    className="flex size-8 items-center justify-center rounded-lg border border-[#ba1a1a]/30 bg-white text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors"
                    onClick={() => setDeletingProduct(p)}
                    title="Hapus Menu"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* DRAWER SIMPAN/EDIT MENU (kanan, ala Edit Struk) */}
      {open && draft && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <form
            className="flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl"
            onSubmit={handleSubmitDraft}
          >
            <div className="flex items-center justify-between border-b border-sand px-5 py-4">
              <h2 className="font-bold text-black text-base">{isNewDraft ? 'Tambah Menu Baru' : 'Edit Menu'}</h2>
              <button type="button" onClick={() => setOpen(false)} className="flex size-8 items-center justify-center rounded-lg border border-clay/60 text-stone">✕</button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
              <Field label="Nama Menu">
                <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Contoh: Kopi Susu Aren" />
              </Field>
              {/* Foto: upload file atau URL (opsional) */}
              <div className="rounded-xl border border-sand bg-cream/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone">Foto Menu</p>
                <div className="mt-2 flex items-center gap-3">
                  {draft.imageUrl ? (
                    <img src={draft.imageUrl} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-sand font-display text-2xl text-stone">
                      {(draft.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif" className="hidden" onChange={handlePhotoFile} />
                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      <span>Upload Foto</span>
                    </Button>
                    {draft.imageUrl && (
                      <Button type="button" variant="outline" onClick={handleRemovePhoto} className="gap-1.5 text-xs text-[#ba1a1a] border-[#ba1a1a]/30">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        <span>Hapus</span>
                      </Button>
                    )}
                  </div>
                </div>
                {photoError && <p className="mt-2 text-xs font-medium text-[#ba1a1a]">{photoError}</p>}
                <div className="mt-3">
                  <Field label="URL Foto (opsional)">
                    <TextInput
                      value={draft.imageUrl.startsWith('data:') ? '' : draft.imageUrl}
                      onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value.trim() })}
                      placeholder="https://… (boleh dikosongkan)"
                    />
                  </Field>
                  <p className="mt-1 text-[11px] text-stone">Opsional — isi URL bila tidak upload file. Upload file menimpa URL.</p>
                </div>
              </div>
              <Field label="Kategori">
                <select
                  className="h-10 w-full rounded-lg border border-clay bg-white px-3 outline-none focus:border-black"
                  value={draft.categoryId}
                  onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Harga Dasar (IDR)">
                <TextInput type="number" value={String(draft.price)} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
              </Field>
              <Field label="HPP (Opsional)">
                <TextInput
                  type="number"
                  value={draft.hpp != null ? String(draft.hpp) : ''}
                  onChange={(e) => setDraft({ ...draft, hpp: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Tidak wajib isi"
                />
                <p className="mt-1 text-[11px] text-stone">Hanya ditampilkan di form, untuk informasi margin.</p>
              </Field>
              <Field label="Deskripsi">
                <TextInput value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Penjelasan singkat menu..." />
              </Field>
              <Field label="Status Ketersediaan">
                <select
                  className="h-10 w-full rounded-lg border border-clay bg-white px-3 outline-none focus:border-black"
                  value={draft.isAvailable ? 'yes' : 'no'}
                  onChange={(e) => setDraft({ ...draft, isAvailable: e.target.value === 'yes' })}
                >
                  <option value="yes">Tersedia (In Stock)</option>
                  <option value="no">Habis (Out of Stock)</option>
                </select>
              </Field>

              <div className="rounded-xl border border-sand bg-cream/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone">Varian & Addons</p>
                <p className="text-xs text-stone mb-2">Pilih dari daftar existing (dropdown), bisa tambah beberapa.</p>
                <div className="grid grid-cols-1 gap-2">
                  {Array.from(new Set(ALL_VARIANTS.map((v) => v.type))).map((type) => (
                    <div key={type}>
                      <p className="text-[11px] font-bold uppercase text-stone">{type}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {ALL_VARIANTS.filter((v) => v.type === type).map((opt) => {
                          const selected = draft.options.some((o) => o.id === opt.id)
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        options: selected ? prev.options.filter((o) => o.id !== opt.id) : [...prev.options, opt],
                                      }
                                    : prev
                                )
                              }}
                              className={`rounded-full border px-3 py-1 text-xs ${selected ? 'bg-black text-white border-black' : 'bg-white text-stone border-clay/60'}`}
                            >
                              {opt.name}
                              {opt.price > 0 ? ` (+${formatRupiah(opt.price)})` : ''}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {draft.options.length > 0 && (
                  <p className="mt-2 text-xs text-sage">{draft.options.length} varian terpilih</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 border-t border-sand px-0 py-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan Menu'}</Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[16px] bg-white p-6 shadow-2xl">
            <h3 className="font-semibold text-black text-base mb-2">Hapus Menu?</h3>
            <p className="text-sm text-stone mb-6">
              Apakah Anda yakin ingin menghapus menu <strong className="text-black">&quot;{deletingProduct.name}&quot;</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeletingProduct(null)}>Batal</Button>
              <Button
                className="bg-[#ba1a1a] hover:bg-[#ba1a1a]/90 text-white"
                disabled={saving}
                onClick={handleDeleteProduct}
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
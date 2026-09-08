import { useState } from 'react'
import { useCafe } from '../../../mock/store'
import { uid } from '../../../shared/lib/format'
import type { StaffUser, UserRole } from '../../../shared/types'
import { Button, Field, TextInput } from '../../../shared/components/ui'

export function StaffPage() {
  const { staff, upsertStaff,removeStaff } = useCafe()
  const visibleStaff = staff.filter((s) => s.role !== 'owner')

  // State Modal Form (Tambah / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'kasir' as UserRole,
    password: '',
  })

  function isStrongPassword(p: string) {
    return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/.test(p)
  }

  // State Modal Konfirmasi Toggle Status Aktif / Nonaktif
  const [toggleStaff, setToggleStaff] = useState<StaffUser | null>(null)
  const [deletingStaff, setDeletingStaff] = useState<StaffUser | null>(null)

  function handleOpenAddModal() {
    setEditingStaff(null)
    setFormData({ name: '', email: '', role: 'kasir', password: '' })
    setShowPassword(false)
    setFormError('')
    setIsFormOpen(true)
  }

  function handleOpenEditModal(user: StaffUser) {
    setEditingStaff(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: user.password || '',
    })
    setShowPassword(false)
    setFormError('')
    setIsFormOpen(true)
  }

  function handleSaveStaff() {
    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError('Nama dan email wajib diisi.')
      return
    }
    if (!formData.password || !isStrongPassword(formData.password)) {
      setFormError('Password wajib min 6 karakter, harus ada huruf, angka, dan simbol (!@#$ etc).')
      return
    }

    const staffData: StaffUser = {
      id: editingStaff?.id || uid('u'),
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role as UserRole,
      active: editingStaff ? editingStaff.active : true,
      password: formData.password,
    }

    upsertStaff(staffData)
    setIsFormOpen(false)
    setFormError('')
  }

  function handleConfirmToggleActive() {
    if (!toggleStaff) return

    upsertStaff({
      ...toggleStaff,
      active: !toggleStaff.active,
    })

    setToggleStaff(null)
  }

  return (
    <div className="space-y-6">
      {/* Header Utama & Tombol Tambah */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] font-semibold tracking-tight">Kelola Staff</h1>
          <p className="text-stone">Manajemen akun pegawai, hak akses, dan status keaktifan.</p>
        </div>

        <Button onClick={handleOpenAddModal} className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Tambah Staff</span>
        </Button>
      </div>

      {/* Tabel List Staff */}
      <div className="overflow-hidden rounded-[12px] border border-[#c4c7c7] bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f7f3ea]/60 text-[11px] uppercase tracking-wider text-stone border-b border-sand">
            <tr>
              <th className="px-5 py-3.5">Nama Staff</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Jabatan / Role</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visibleStaff.map((s) => (
              <tr key={s.id} className="border-t border-sand hover:bg-cream/30 transition-colors">
                <td className="px-5 py-3.5 font-bold text-black">{s.name}</td>
                <td className="px-5 py-3.5 text-stone">{s.email}</td>
                <td className="px-5 py-3.5">
                  <span className="rounded-md bg-sand px-2.5 py-1 text-xs font-semibold capitalize text-black">
                    {s.role}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      s.active ? 'bg-[#b8cda9]/40 text-sage' : 'bg-[#ba1a1a]/10 text-[#ba1a1a]'
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${s.active ? 'bg-sage' : 'bg-[#ba1a1a]'}`} />
                    {s.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                    onClick={() => handleOpenEditModal(s)}
                    className="flex size-8 items-center justify-center rounded-lg border border-clay/60 bg-white text-stone hover:border-black hover:text-black transition-colors"
                    title="Edit Staff"
                    >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                    onClick={() => setToggleStaff(s)}
                    className={`flex size-8 items-center justify-center rounded-lg border transition-colors ${
                        s.active
                        ? 'border-sage/40 bg-white text-sage hover:bg-sage/10'
                        : 'border-clay/60 bg-white text-stone hover:border-black hover:text-black'
                    }`}
                    title={s.active ? 'Nonaktifkan Staff' : 'Aktifkan Staff'}
                    >
                    <span className="material-symbols-outlined text-[16px]">
                        {s.active ? 'block' : 'check_circle'}
                    </span>
                    </button>
                    {/* TOMBOL HAPUS */}
                    <button
                    onClick={() => setDeletingStaff(s)}
                    className="flex size-8 items-center justify-center rounded-lg border border-[#ba1a1a]/30 bg-white text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors"
                    title="Hapus Staff"
                    >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                </div>
                </td>
              </tr>
            ))}

            {visibleStaff.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-stone">
                  Belum ada data staff.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL POPUP TAMBAH / EDIT STAFF */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <h3 className="font-bold text-black text-base">
                {editingStaff ? 'Edit Data Staff' : 'Tambah Staff Baru'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="font-bold text-stone">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Nama Lengkap">
                <TextInput
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  autoFocus
                />
              </Field>

              <Field label="Alamat Email">
                <TextInput
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contoh: budi@cafe.com"
                />
              </Field>

              <Field label="Jabatan / Role">
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="h-10 w-full rounded-lg border border-clay bg-white px-3 text-sm font-semibold outline-none focus:border-black"
                >
                  <option value="kasir">Kasir</option>
                  <option value="barista">Barista</option>
                </select>
              </Field>

              <Field label="Password">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6: huruf, angka, simbol (contoh: Kasir123!)"
                    className="h-10 w-full rounded-lg border border-clay bg-white px-3 pr-10 text-sm outline-none focus:border-black"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-stone hover:bg-sand hover:text-black"
                    title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-stone">Wajib 6 karakter, kombinasi huruf + angka + simbol.</p>
              </Field>

              {formError && (
                <div className="rounded-lg border border-[#ba1a1a]/30 bg-[#ba1a1a]/10 px-3 py-2 text-xs font-medium text-[#ba1a1a]">
                  {formError}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-sand pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>
                Batal
              </Button>
              <Button
                className="flex-1"
                disabled={!formData.name.trim() || !formData.email.trim() || !formData.password}
                onClick={handleSaveStaff}
              >
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI STATUS */}
      {toggleStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[16px] bg-white p-6 shadow-2xl">
            <h3 className="font-semibold text-black text-base mb-2">
              {toggleStaff.active ? 'Nonaktifkan Staff?' : 'Aktifkan Staff?'}
            </h3>
            <p className="text-sm text-stone mb-6">
              Apakah Anda yakin ingin {toggleStaff.active ? 'menonaktifkan' : 'mengaktifkan'} akun{' '}
              <strong className="text-black">{toggleStaff.name}</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setToggleStaff(null)}>
                Batal
              </Button>
              <Button
                className={toggleStaff.active ? 'bg-[#ba1a1a] hover:bg-[#ba1a1a]/90 text-white' : ''}
                onClick={handleConfirmToggleActive}
              >
                Ya, {toggleStaff.active ? 'Nonaktifkan' : 'Aktifkan'}
              </Button>
            </div>
          </div>
        </div>
      )}
        {/* MODAL KONFIRMASI HAPUS STAFF */}
        {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-[16px] bg-white p-6 shadow-2xl">
            <h3 className="font-semibold text-black text-base mb-2">Hapus Staff?</h3>
            <p className="text-sm text-stone mb-6">
                Apakah Anda yakin ingin menghapus data staff <strong className="text-black">{deletingStaff.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeletingStaff(null)}>
                Batal
                </Button>
                {/* GUNAKAN TAG <button> BIASA AGAR ONCLICK DITERUSKAN DENGAN PASTI */}
                <button
                type="button"
                className="rounded-lg bg-[#ba1a1a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#ba1a1a]/90 transition-colors"
                onClick={() => {
                    removeStaff(deletingStaff.id)
                    setDeletingStaff(null)
                }}
                >
                Hapus
                </button>
            </div>
            </div>
        </div>
        )}
    </div>
  )
}
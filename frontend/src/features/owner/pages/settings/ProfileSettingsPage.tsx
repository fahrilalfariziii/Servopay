import { useState } from 'react'
import { useCafe } from '../../../../mock/store'
import { Button, Field, TextInput } from '../../../../shared/components/ui'

function isStrongPassword(p: string) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(p)
}

export function ProfileSettingsPage() {
  const { session, upsertStaff } = useCafe()
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!session) return
    if (!oldPass || !newPass || !confirmPass) {
      setMsg({ type: 'error', text: 'Semua field password wajib diisi.' })
      return
    }
    if (oldPass !== session.user.password) {
      setMsg({ type: 'error', text: 'Password lama tidak sesuai.' })
      return
    }
    if (newPass !== confirmPass) {
      setMsg({ type: 'error', text: 'Konfirmasi password tidak cocok.' })
      return
    }
    if (!isStrongPassword(newPass)) {
      setMsg({ type: 'error', text: 'Password baru min 8 karakter, harus ada huruf, angka, dan simbol.' })
      return
    }
    upsertStaff({ ...session.user, password: newPass })
    setMsg({ type: 'success', text: 'Password berhasil diperbarui.' })
    setOldPass('')
    setNewPass('')
    setConfirmPass('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight">Profil Akun</h1>
        <p className="text-stone">Informasi akun pengguna dan hak akses peran Anda dalam sistem.</p>
      </div>

      <div className="max-w-2xl rounded-[16px] border border-[#c4c7c7] bg-white p-6 shadow-2xs space-y-6">
        <div className="flex items-center gap-4 border-b border-sand pb-6">
          <div className="flex size-16 items-center justify-center rounded-full bg-sand font-display text-2xl font-bold text-black">
            {session?.user.name.charAt(0) || 'O'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-black">{session?.user.name || 'Owner Cafe'}</h2>
            <p className="text-xs text-stone">{session?.user.email || 'owner@cafe.com'}</p>
            <span className="mt-1 inline-block rounded-md bg-sage/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sage">
              {session?.user.role || 'Owner'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone">Detail Pengguna</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nama Pengguna">
              <TextInput value={session?.user.name || ''} disabled readOnly className="bg-cream/50 cursor-not-allowed" />
            </Field>
            <Field label="Alamat Email">
              <TextInput value={session?.user.email || ''} disabled readOnly className="bg-cream/50 cursor-not-allowed" />
            </Field>
          </div>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="max-w-2xl rounded-[16px] border border-[#c4c7c7] bg-white p-6 shadow-2xs space-y-4">
        <div className="border-b border-sand pb-3">
          <h2 className="font-bold text-black">Ubah Password</h2>
          <p className="text-xs text-stone">Ganti password akun Anda sendiri. Min 8 karakter (huruf + angka + simbol).</p>
        </div>

        {msg && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              msg.type === 'success' ? 'border-sage/40 bg-[#b8cda9]/30 text-sage' : 'border-[#ba1a1a]/30 bg-[#ba1a1a]/10 text-[#ba1a1a]'
            }`}
          >
            {msg.text}
          </div>
        )}

        <Field label="Password Lama">
          <div className="relative">
            <input
              type={showOld ? 'text' : 'password'}
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              placeholder="Masukkan password lama"
              className="h-10 w-full rounded-lg border border-clay bg-white px-3 pr-10 text-sm outline-none focus:border-black"
            />
            <button type="button" onClick={() => setShowOld((v) => !v)} className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-stone hover:bg-sand">
              <span className="material-symbols-outlined text-[18px]">{showOld ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </Field>

        <Field label="Password Baru">
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Contoh: Baru123!"
              className="h-10 w-full rounded-lg border border-clay bg-white px-3 pr-10 text-sm outline-none focus:border-black"
            />
            <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-stone hover:bg-sand">
              <span className="material-symbols-outlined text-[18px]">{showNew ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </Field>

        <Field label="Konfirmasi Password Baru">
          <input
            type="password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="Ulangi password baru"
            className="h-10 w-full rounded-lg border border-clay bg-white px-3 text-sm outline-none focus:border-black"
          />
        </Field>

        <div className="flex justify-end border-t border-sand pt-4">
          <Button type="submit" className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">lock_reset</span>
            <span>Simpan Password</span>
          </Button>
        </div>
      </form>
    </div>
  )
}

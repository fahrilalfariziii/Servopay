import { useEffect, useState } from 'react'
import { useCafe } from '../../../../mock/store'
import { Button, Field, TextInput } from '../../../../shared/components/ui'
import type { PaymentMethod, PaymentSettings } from '../../../../shared/types'

type MethodMeta = { id: PaymentMethod; label: string; sub: string; icon: string }

const METHODS: MethodMeta[] = [
  { id: 'cash', label: 'Tunai (Cash)', sub: 'Manual — bayar di kasir', icon: 'payments' },
  { id: 'qris', label: 'QRIS', sub: 'Midtrans dinamis — QR tampil otomatis', icon: 'qr_code' },
  { id: 'ewallet', label: 'E-Wallet', sub: 'GoPay / ShopeePay via Midtrans', icon: 'account_balance_wallet' },
  { id: 'bank_transfer', label: 'Transfer Bank (VA)', sub: 'Virtual Account via Midtrans', icon: 'account_balance' },
]

export function PaymentSettingsPage() {
  const { business, updateBusiness } = useCafe()
  const [enabled, setEnabled] = useState<PaymentMethod[]>((business.enabledPaymentMethods as PaymentMethod[]) ?? ['cash', 'qris'])
  const [settings, setSettings] = useState<Record<string, PaymentSettings>>((business.paymentSettings as Record<string, PaymentSettings>) ?? {})
  const [midtransMode, setMidtransMode] = useState<'global' | 'custom'>((business.midtransMode as 'global'|'custom') ?? 'global')
  const [midtransServerKey, setMidtransServerKey] = useState('')
  const [midtransClientKey, setMidtransClientKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setEnabled((business.enabledPaymentMethods as PaymentMethod[]) ?? ['cash', 'qris'])
    setSettings((business.paymentSettings as Record<string, PaymentSettings>) ?? {})
    setMidtransMode((business.midtransMode as 'global'|'custom') ?? 'global')
  }, [business.enabledPaymentMethods, business.paymentSettings, business.midtransMode])

  function toggleMethod(id: PaymentMethod) {
    setError('')
    setEnabled((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id)
        if (next.length === 0) { setError('Minimal 1 metode pembayaran harus aktif'); return prev }
        return next
      }
      return [...prev, id]
    })
  }
  function updateSetting(id: PaymentMethod, patch: Partial<PaymentSettings>) {
    setSettings((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }
  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (enabled.length === 0) { setError('Minimal 1 metode pembayaran harus aktif'); return }
    const payload: Record<string, unknown> = { enabledPaymentMethods: enabled, paymentSettings: settings, midtransMode }
    if (midtransMode === 'custom') {
      if (midtransServerKey.trim()) payload.midtransServerKey = midtransServerKey.trim()
      if (midtransClientKey.trim()) payload.midtransClientKey = midtransClientKey.trim()
    }
    updateBusiness(payload as unknown as Record<string, unknown> as never)
    setSaved(true); setTimeout(()=>setSaved(false),2500)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight">Pembayaran</h1>
        <p className="text-stone">Pilih metode yang tampil di Self-Order. QRIS/E-Wallet/VA via Midtrans tampil otomatis + auto-verifikasi webhook.</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl rounded-[16px] border border-[#c4c7c7] bg-white p-6 shadow-2xs space-y-5">
        <div className="border-b border-sand pb-3">
          <h2 className="font-bold text-black">Sumber Midtrans</h2>
          <p className="text-xs text-stone">Pilih pakai Midtrans milik Servopay (global env) atau Midtrans milik owner (custom per-business, terenkripsi).</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(['global','custom'] as const).map((mode)=>(
            <label key={mode} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${midtransMode===mode?'border-black bg-cream':'border-clay/40 bg-white'}`}>
              <input type="radio" name="midtransMode" checked={midtransMode===mode} onChange={()=>setMidtransMode(mode)} className="mt-1"/>
              <div>
                <p className="text-sm font-semibold text-black">{mode==='global'?'Midtrans Servopay (Global)':'Midtrans Owner (Custom)'}</p>
                <p className="text-xs text-stone">{mode==='global'?'Pakai MIDTRANS_SERVER_KEY di .env server.':'Input ServerKey/ClientKey owner, disimpan terenkripsi.'}</p>
                {mode==='custom' && business.hasMidtransCustomKey && <p className="text-[11px] text-sage mt-1">✓ Custom key tersimpan</p>}
              </div>
            </label>
          ))}
        </div>

        {midtransMode==='custom' && (
          <div className="rounded-xl border border-sand bg-cream/40 p-4 space-y-3">
            <Field label="Midtrans Server Key (Owner) — write-only, terenkripsi">
              <TextInput type="password" value={midtransServerKey} onChange={(e)=>setMidtransServerKey(e.target.value)} placeholder={business.hasMidtransCustomKey?'•••••••• (sudah tersimpan, kosongkan jika tidak ganti)':'SB-Mid-server-...'} />
            </Field>
            <Field label="Midtrans Client Key (opsional)">
              <TextInput value={midtransClientKey} onChange={(e)=>setMidtransClientKey(e.target.value)} placeholder="SB-Mid-client-..." />
            </Field>
            <p className="text-[11px] text-stone">ServerKey tidak pernah dikirim ke frontend. Untuk ganti, isi baru lalu Simpan.</p>
          </div>
        )}

        <div className="border-b border-sand pb-3 pt-2">
          <h2 className="font-bold text-black">Metode Pembayaran</h2>
          <p className="text-xs text-stone">Aktifkan minimal 1. Atur gateway Manual vs Midtrans per metode.</p>
        </div>

        {saved && <div className="flex items-center gap-2 rounded-lg bg-[#b8cda9]/30 p-3 text-xs font-semibold text-sage border border-sage/40"><span className="material-symbols-outlined text-[18px]">check_circle</span><span>Pengaturan pembayaran berhasil disimpan!</span></div>}
        {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-[#ba1a1a] border border-red-200"><span className="material-symbols-outlined text-[18px]">error</span><span>{error}</span></div>}

        <div className="space-y-3">
          {METHODS.map((m)=>{
            const isEnabled = enabled.includes(m.id)
            const cfg = settings[m.id] ?? {}
            const gateway = (cfg.gateway as 'manual'|'midtrans') ?? (m.id==='cash'?'manual':'midtrans')
            return (
              <div key={m.id} className={`rounded-xl border p-4 ${isEnabled?'border-black bg-white':'border-sand bg-cream/40'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] text-stone">{m.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-black">{m.label}</p>
                      <p className="text-xs text-stone">{m.sub} {gateway==='midtrans' && <span className="ml-1 rounded bg-sage/10 px-1.5 py-0.5 text-[10px] font-bold text-sage">MIDTRANS</span>}{gateway==='manual' && <span className="ml-1 rounded bg-clay/30 px-1.5 py-0.5 text-[10px]">MANUAL</span>}</p>
                    </div>
                  </div>
                  <button type="button" onClick={()=>toggleMethod(m.id)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isEnabled?'bg-sage':'bg-clay/50'}`}><span className={`inline-block size-5 transform rounded-full bg-white shadow transition ${isEnabled?'translate-x-5':'translate-x-0'}`} /></button>
                </div>

                {isEnabled && (
                  <div className="mt-4 space-y-3 border-t border-sand pt-4">
                    {m.id!=='cash' && (
                      <div className="flex gap-2">
                        {(['manual','midtrans'] as const).map((gw)=>(
                          <button key={gw} type="button" onClick={()=>updateSetting(m.id, {gateway: gw})} className={`flex-1 rounded-lg border py-2 text-xs font-bold uppercase ${gateway===gw?'border-black bg-black text-white':'border-clay bg-white text-stone'}`}>{gw}</button>
                        ))}
                      </div>
                    )}

                    {m.id==='qris' && gateway==='midtrans' && (
                      <p className="rounded-lg bg-cream/60 border border-sand p-3 text-[11px] text-stone">QRIS ikut default Midtrans (GoPay, tanpa perlu pilih acquirer). QR bisa di-scan e-wallet apapun (standar BI).</p>
                    )}

                    {m.id==='ewallet' && gateway==='midtrans' && (
                      <Field label="E-Wallet Channel (Midtrans)">
                        <select value={(cfg.channel as string) ?? 'gopay'} onChange={(e)=>updateSetting(m.id,{channel:e.target.value as 'gopay'|'shopeepay'})} className="h-10 w-full rounded-lg border border-clay bg-white px-3 text-sm outline-none focus:border-black">
                          <option value="gopay">GoPay</option>
                          <option value="shopeepay">ShopeePay</option>
                        </select>
                      </Field>
                    )}

                    {m.id==='bank_transfer' && gateway==='midtrans' && (
                      <Field label="Bank VA (Midtrans)">
                        <select value={(cfg.bank as string) ?? 'bca'} onChange={(e)=>updateSetting(m.id,{bank:e.target.value as 'bca'|'bni'|'bri'|'mandiri'|'permata'|'cimb'})} className="h-10 w-full rounded-lg border border-clay bg-white px-3 text-sm outline-none focus:border-black">
                          <option value="bca">BCA</option><option value="bni">BNI</option><option value="bri">BRI</option><option value="mandiri">Mandiri</option><option value="permata">Permata</option><option value="cimb">CIMB</option>
                        </select>
                      </Field>
                    )}

                    {gateway==='manual' && m.id!=='cash' && m.id==='ewallet' && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone mb-2">E-Wallet manual yang diterima</p>
                        <div className="flex flex-wrap gap-2">
                          {['gopay','dana','shopeepay','ovo','linkaja'].map((w)=>{
                            const active=(cfg.wallets??[]).includes(w)
                            return <button key={w} type="button" onClick={()=>{const cur=cfg.wallets??[]; const next=active?cur.filter(x=>x!==w):[...cur,w]; updateSetting(m.id,{wallets:next})}} className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${active?'border-black bg-black text-white':'border-clay bg-white text-stone'}`}>{w}</button>
                          })}
                        </div>
                      </div>
                    )}

                    {gateway==='manual' && m.id==='bank_transfer' && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Nama Bank"><TextInput value={cfg.bankName??''} onChange={(e)=>updateSetting(m.id,{bankName:e.target.value})} placeholder="BCA"/></Field>
                        <Field label="No. Rekening / VA"><TextInput value={cfg.accountNumber??''} onChange={(e)=>updateSetting(m.id,{accountNumber:e.target.value})} placeholder="1234567890"/></Field>
                        <div className="sm:col-span-2"><Field label="Atas Nama"><TextInput value={cfg.accountName??''} onChange={(e)=>updateSetting(m.id,{accountName:e.target.value})} placeholder="Bean & Brew"/></Field></div>
                      </div>
                    )}

                    <Field label="Instruksi pelanggan (opsional)">
                      <textarea value={cfg.instruction??''} onChange={(e)=>updateSetting(m.id,{instruction:e.target.value})} placeholder={m.id==='cash'?'Bayar tunai di kasir': gateway==='midtrans'?'Ditampilkan otomatis Midtrans, tambah catatan jika perlu':'Transfer manual, tunjukkan bukti ke kasir'} rows={2} className="w-full rounded-lg border border-clay bg-white px-3 py-2 text-sm outline-none focus:border-black"/>
                    </Field>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex justify-end border-t border-sand pt-4">
          <Button type="submit" className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">save</span><span>Simpan Pembayaran</span></Button>
        </div>
      </form>
    </div>
  )
}

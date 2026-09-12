import { useEffect, useState } from 'react'
import { useCafe } from '../../../../mock/store'
import { Button, Field } from '../../../../shared/components/ui'

export function TaxSettingsPage() {
  const { business, saveBusinessSettings } = useCafe()
  const [form, setForm] = useState({
    taxEnabled: business.taxEnabled ?? true,
    taxLabel: business.taxLabel || 'PB1' as const,
    taxRate: String(business.taxRate ?? 10),
    taxBearer: (business.taxBearer as 'customer' | 'cafe') || 'customer' as const,
    serviceChargeEnabled: business.serviceChargeEnabled ?? true,
    serviceChargeRate: String(business.serviceChargeRate ?? 5),
  })
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({
      taxEnabled: business.taxEnabled ?? true,
      taxLabel: business.taxLabel || 'PB1',
      taxRate: String(business.taxRate ?? 10),
      taxBearer: (business.taxBearer as 'customer' | 'cafe') || 'customer',
      serviceChargeEnabled: business.serviceChargeEnabled ?? true,
      serviceChargeRate: String(business.serviceChargeRate ?? 5),
    })
  }, [business])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    const parsedTax = Math.min(100, Math.max(0, Number(form.taxRate) || 0))
    const parsedService = Math.min(100, Math.max(0, Number(form.serviceChargeRate) || 0))
    setSaving(true)
    setSaveError(null)
    try {
      await saveBusinessSettings({
        taxEnabled: form.taxEnabled,
        taxLabel: form.taxLabel as 'PB1' | 'PBJT' | 'PPN',
        taxRate: parsedTax,
        taxBearer: form.taxBearer,
        serviceChargeEnabled: form.serviceChargeEnabled,
        serviceChargeRate: parsedService,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan pajak')
    } finally {
      setSaving(false)
    }
  }

  const exampleService = 50000 * ((Number(form.serviceChargeRate) || 0) / 100)
  const exampleBase = 50000 + (form.serviceChargeEnabled ? exampleService : 0)
  const exampleTax = form.taxEnabled ? exampleBase * ((Number(form.taxRate) || 0) / 100) : 0
  const exampleTotalCustomer = 50000 + (form.serviceChargeEnabled ? exampleService : 0) + (form.taxBearer === 'customer' && form.taxEnabled ? exampleTax : 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight">Pajak & Biaya</h1>
        <p className="text-stone">Kelola pajak layanan dan biaya layanan untuk perhitungan total transaksi.</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl rounded-[16px] border border-[#c4c7c7] bg-white p-6 shadow-2xs space-y-5">
        <div className="border-b border-sand pb-3">
          <h2 className="font-bold text-black">Pajak & Biaya Layanan</h2>
          <p className="text-xs text-stone">Atur PB1/PBJT/PPN dan Service Charge. Diterapkan otomatis: subtotal + service → pajak.</p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-lg bg-[#b8cda9]/30 p-3 text-xs font-semibold text-sage border border-sage/40">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>Pengaturan pajak berhasil disimpan!</span>
          </div>
        )}
        {saveError && (
          <div className="flex items-center gap-2 rounded-lg bg-[#ba1a1a]/10 p-3 text-xs font-semibold text-[#ba1a1a] border border-[#ba1a1a]/30">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{saveError}</span>
          </div>
        )}

        {/* Toggle Pajak */}
        <div className="flex items-center justify-between rounded-xl border border-sand bg-cream/40 p-4">
          <div>
            <p className="text-sm font-semibold text-black">Aktifkan Pajak</p>
            <p className="text-xs text-stone">Jika dimatikan, pajak tidak dihitung sama sekali.</p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, taxEnabled: !form.taxEnabled })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${form.taxEnabled ? 'bg-sage' : 'bg-clay/50'}`}
          >
            <span className={`inline-block size-5 transform rounded-full bg-white shadow transition ${form.taxEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Opsi Beban Pajak */}
        <div className={`rounded-xl border border-sand bg-cream/40 p-4 space-y-3 ${!form.taxEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone">Pajak dibebankan ke</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${form.taxBearer === 'customer' ? 'border-black bg-white' : 'border-clay/40 bg-white'}`}>
              <input
                type="radio"
                name="taxBearer"
                value="customer"
                checked={form.taxBearer === 'customer'}
                onChange={() => setForm({ ...form, taxBearer: 'customer' })}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-semibold text-black">Pelanggan</p>
                <p className="text-xs text-stone">Pelanggan membayar pajak (total + pajak).</p>
              </div>
            </label>
            <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${form.taxBearer === 'cafe' ? 'border-black bg-white' : 'border-clay/40 bg-white'}`}>
              <input
                type="radio"
                name="taxBearer"
                value="cafe"
                checked={form.taxBearer === 'cafe'}
                onChange={() => setForm({ ...form, taxBearer: 'cafe' })}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-semibold text-black">Kafe</p>
                <p className="text-xs text-stone">Pajak ditanggung kafe (pelanggan bayar tanpa pajak).</p>
              </div>
            </label>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-3 ${!form.taxEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
          <Field label="Jenis Pajak">
            <select
              value={form.taxLabel}
              onChange={(e) => setForm({ ...form, taxLabel: e.target.value as 'PB1' | 'PBJT' | 'PPN' })}
              className="h-10 w-full rounded-lg border border-clay bg-white px-3 text-sm font-medium outline-none focus:border-black"
              disabled={!form.taxEnabled}
            >
              <option value="PB1">PB1</option>
              <option value="PBJT">PBJT</option>
              <option value="PPN">PPN</option>
            </select>
          </Field>
          <Field label={`${form.taxLabel} (%)`}>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.taxRate}
              onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
              placeholder="10"
              disabled={!form.taxEnabled}
              className="h-10 w-full rounded-lg border border-clay bg-white px-3 text-sm outline-none focus:border-black disabled:bg-sand/40"
            />
          </Field>
          <Field label="Service Charge (%)">
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.serviceChargeRate}
                onChange={(e) => setForm({ ...form, serviceChargeRate: e.target.value })}
                placeholder="5"
                disabled={!form.serviceChargeEnabled}
                className="h-10 flex-1 rounded-lg border border-clay bg-white px-3 text-sm outline-none focus:border-black disabled:bg-sand/40"
              />
              <label className="flex items-center gap-1.5 text-xs font-medium text-stone">
                <input
                  type="checkbox"
                  checked={form.serviceChargeEnabled}
                  onChange={(e) => setForm({ ...form, serviceChargeEnabled: e.target.checked })}
                  className="size-4 rounded border-clay"
                />
                Aktif
              </label>
            </div>
          </Field>
        </div>
        <p className="text-[11px] text-stone">
          Contoh: Subtotal Rp50.000 → Service {form.serviceChargeEnabled ? `${form.serviceChargeRate}% = Rp${Math.round(exampleService).toLocaleString('id-ID')}` : '0'} → {form.taxEnabled ? `${form.taxLabel} ${form.taxRate}% = Rp${Math.round(exampleTax).toLocaleString('id-ID')}` : 'Pajak 0'} →{' '}
          {form.taxBearer === 'customer' && form.taxEnabled ? `Total Rp${Math.round(exampleTotalCustomer).toLocaleString('id-ID')} (pelanggan)` : `Pelanggan bayar Rp${Math.round(50000 + (form.serviceChargeEnabled ? exampleService : 0)).toLocaleString('id-ID')}, kafe tanggung Rp${Math.round(exampleTax).toLocaleString('id-ID')}`}
        </p>

        <div className="flex justify-end border-t border-sand pt-4">
          <Button type="submit" disabled={saving} className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>{saving ? 'Menyimpan…' : 'Simpan Pajak'}</span>
          </Button>
        </div>
      </form>
    </div>
  )
}

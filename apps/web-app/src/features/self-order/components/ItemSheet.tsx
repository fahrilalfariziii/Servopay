import { useState } from 'react'
import type { CartItem, Product } from '../../../shared/types'
import { normalizeTheme } from '../../../shared/types'
import { useCafe } from '../../../mock/store'
import { formatRupiah } from '../../../shared/lib/format'
import { Button } from '../../../shared/components/ui'
import { IconPlus } from '../../../shared/components/icons'

interface Props {
  item: Product
  onClose: () => void
  onAdd: (
    item: Product,
    optionsLabel: string,
    options: CartItem['options'],
    unitPrice: number,
    qty: number,
  ) => void
}

function groupOptions(item: Product) {
  const types = [...new Set(item.options.map((o) => o.type))]
  return types.map((type) => ({
    type,
    label:
      type === 'temperature'
        ? 'Suhu'
        : type === 'sugar'
          ? 'Tingkat Gula'
          : type === 'ice'
            ? 'Tingkat Es'
            : type === 'milk'
              ? 'Pilihan Susu'
              : 'Tambahan',
    options: item.options.filter((o) => o.type === type),
  }))
}

export function ItemSheet({ item, onClose, onAdd }: Props) {
  const { business } = useCafe()
  const theme = normalizeTheme(business.theme)
  const groups = groupOptions(item)
  const [qty, setQty] = useState(1)
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const g of groups) {
      if (g.options[0] && g.options.some((o) => o.isRequired)) init[g.type] = g.options[0].id
    }
    return init
  })
  const [addons, setAddons] = useState<string[]>([])

  const unitPrice =
    item.price +
    item.options
      .filter((o) => selected[o.type] === o.id || addons.includes(o.id))
      .reduce((s, o) => s + o.price, 0)

  function submit() {
    const options: CartItem['options'] = {}
    const labels: string[] = []
    for (const g of groups) {
      if (g.type === 'addon') continue
      const opt = g.options.find((o) => o.id === selected[g.type])
      if (opt) {
        options[g.type] = opt.name
        if (opt.price > 0 || (g.type !== 'sugar' && opt.name !== 'Normal' && opt.name !== 'Hot' && opt.name !== 'Regular')) {
          labels.push(opt.name)
        } else if (opt.name !== 'Hot' && opt.name !== 'Normal' && opt.name !== 'Regular') {
          labels.push(opt.name)
        }
      }
    }
    for (const id of addons) {
      const opt = item.options.find((o) => o.id === id)
      if (opt) {
        options[opt.name] = true
        labels.push(opt.name)
      }
    }
    onAdd(item, labels.join(', '), options, unitPrice, qty)
  }

  return (
    /* Overlay Fixed yang menutupi layar & terpusat secara horizontal */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      {/* Kontainer Sheet yang dibatasi max-w-md agar presisi di layar besar */}
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] shadow-2xl transition-all"
        style={{ background: theme.pageBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-clay/20 px-5 py-4">
          <div>
            <p className="font-display text-[20px] font-semibold text-ink">{item.name}</p>
            <p className="text-sm font-semibold text-soil">{formatRupiah(item.price)}</p>
          </div>
          <button className="flex size-10 items-center justify-center text-2xl leading-none text-soil" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 scrollbar-hide">
          <div className="flex flex-col gap-6">
            {groups.map((g) =>
              g.type === 'addon' ? (
                <div key={g.type} className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-ink">{g.label}</p>
                  {g.options.map((opt) => {
                    const checked = addons.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setAddons((prev) => (prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]))
                        }
                        className="flex items-center justify-between rounded-[12px] border border-clay/20 bg-[#f3f3f3] p-[13px] text-left"
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`flex size-5 items-center justify-center rounded-[4px] border ${checked ? '' : 'border-[#80756c] bg-white'}`}
                            style={checked ? { borderColor: theme.accent, background: theme.accent } : undefined}
                          >
                            {checked && <span className="text-[10px] text-white">✓</span>}
                          </span>
                          {opt.name}
                        </span>
                        <span className="text-sm font-semibold">+{formatRupiah(opt.price)}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div key={g.type} className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-ink">{g.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.options.map((opt) => {
                      const active = selected[g.type] === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelected((s) => ({ ...s, [g.type]: opt.id }))}
                          style={active ? { borderColor: theme.accent, background: `${theme.accent}26`, color: theme.primary } : undefined}
                          className={`rounded-full px-[18px] py-[10px] text-sm ${
                            active
                              ? 'border-2 font-medium'
                              : 'border border-clay/30 bg-[#eee] text-soil'
                          }`}
                        >
                          {opt.name}
                          {opt.price > 0 ? ` +${opt.price / 1000}k` : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ),
            )}
            {groups.length === 0 && (
              <p className="text-sm text-soil">Tidak ada pilihan tambahan untuk menu ini.</p>
            )}
          </div>
        </div>

        <div className="border-t border-clay/20 px-5 py-5" style={{ background: theme.pageBg }}>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-[20px] font-semibold">Total: {formatRupiah(unitPrice * qty)}</p>
            <div className="flex h-10 items-center rounded-full border border-clay/30 bg-[#eee]">
              <button className="flex h-full w-10 items-center justify-center" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                –
              </button>
              <span className="flex h-full w-8 items-center justify-center border-x border-[#bcbcbc]/70 text-center font-bold">{qty}</span>
              <button className="flex h-full w-10 items-center justify-center" onClick={() => setQty((q) => q + 1)}>
                <IconPlus color="#4E453D" />
              </button>
            </div>
          </div>
          <Button className="w-full rounded-[12px] py-[14px]" style={{ background: theme.primary }} onClick={submit}>
            Tambah ke Keranjang
          </Button>
        </div>
      </div>
    </div>
  )
}
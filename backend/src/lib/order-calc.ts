// Rumus ini harus tetap identik dengan frontend/src/mock/store.tsx agar total yang ditampilkan di UI (saat nanti disambungkan) konsisten dengan yang dihitung backend.
// PENTING: taxRate & serviceChargeRate disimpan sebagai angka PERSEN (mis. 10 = 10%), sama seperti Business.taxRate di frontend/src/mock/data.ts — BUKAN pecahan 0..1.
//
//   service  = subtotal * (serviceChargeRate / 100)   (jika serviceChargeEnabled)
//   taxBase  = subtotal + service
//   tax      = taxBase * (taxRate / 100)               (jika taxEnabled)
//   total    = subtotal + service + (taxBearer === 'cafe' ? 0 : tax)
//
// Catatan: tax tetap dihitung & disimpan meski taxBearer = 'cafe' (untuk pelaporan), hanya saja tidak ditambahkan ke total yang dibayar pelanggan.

export interface BusinessTaxSettings {
  taxEnabled: boolean;
  taxRate: number;
  taxLabel: string;
  taxBearer: string; // 'customer' | 'cafe'
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
}

export interface OrderTotals {
  subtotal: number;
  serviceCharge: number;
  tax: number;
  taxLabel: string;
  taxBearer: string;
  total: number;
}

export function calculateOrderTotals(
  subtotal: number,
  business: BusinessTaxSettings
): OrderTotals {
  const serviceCharge = business.serviceChargeEnabled
    ? round2(subtotal * (business.serviceChargeRate / 100))
    : 0;

  const taxBase = subtotal + serviceCharge;
  const tax = business.taxEnabled ? round2(taxBase * (business.taxRate / 100)) : 0;

  const total =
    subtotal + serviceCharge + (business.taxBearer === "cafe" ? 0 : tax);

  return {
    subtotal: round2(subtotal),
    serviceCharge,
    tax,
    taxLabel: business.taxLabel,
    taxBearer: business.taxBearer,
    total: round2(total),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

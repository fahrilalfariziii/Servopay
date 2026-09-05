import { prisma } from "../lib/prisma";

const BASE_OFFSET = 9023; // meniru format mock frontend: BB-9023, BB-9024, dst.

/**
 * Menghasilkan nomor order unik per bisnis, format "<PREFIX>-<angka>".
 * Prefix diambil dari 2 huruf pertama nama bisnis (fallback "OR").
 *
 * Karena ini dipanggil bersamaan dengan banyak request paralel, angka dihitung
 * dari jumlah order yang sudah ada + retry kalau ternyata bentrok (unique constraint)
 * — retry ditangani oleh pemanggil (order.service.ts) lewat loop create.
 */
export async function nextOrderNumber(businessId: number, businessName: string, attempt = 0) {
  const prefix = businessName.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "OR";
  const count = await prisma.order.count({ where: { businessId } });
  const sequence = BASE_OFFSET + count + attempt;
  return `${prefix}-${sequence}`;
}

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth, requireRole } from "../middleware/auth";
import { FEATURES, getBusinessFeatures } from "../lib/feature-gate";
import { encrypt, isEncrypted } from "../lib/encryption";
import { emitBusinessCashUpdate, emitBusinessUpdated } from "../lib/realtime";

export const businessRouter = Router();
businessRouter.use(requireAuth);

// GET /api/business — profil bisnis milik user yang login (semua role boleh baca)
businessRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const business = await prisma.business.findUnique({ where: { id: req.auth!.businessId } });
    if (!business) throw AppError.notFound("Bisnis tidak ditemukan");
    const { midtransServerKeyEnc: _enc, ...safe } = business as unknown as Record<string, unknown> & { midtransServerKeyEnc?: string };
    res.json({ ...safe, hasMidtransCustomKey: Boolean(_enc), midtransServerKeyEnc: undefined });
  })
);

const paymentSettingsValueSchema = z.object({
  // Deprecated: non-cash SELALU via Midtrans (default paksa server) dan instruksi
  // pelanggan dihapus dari UI. Tetap diterima agar payload lama tidak error,
  // tapi DIABAIKAN backend.
  instruction: z.string().max(800).optional(),
  qrImageUrl: z.string().optional(),
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(50).optional(),
  accountName: z.string().max(100).optional(),
  wallets: z.array(z.string()).optional(),
  gateway: z.enum(["manual", "midtrans"]).optional(),
  // Deprecated: tidak lagi dikirim ke Midtrans (ikut default gopay).
  // Tetap diterima agar payload lama tidak error, tapi diabaikan backend.
  acquirer: z.string().optional(),
  bank: z.enum(["bca", "mandiri", "bni", "bri"]).optional(),
  allowedBanks: z.array(z.enum(["bca", "mandiri", "bni", "bri"])).optional(),
  // Dormant: ewallet dihapus dari produk (tak ada UI). Tetap diterima agar payload lama tidak error.
  channel: z.enum(["gopay", "shopeepay"]).optional(),
});

const updateBusinessSchema = z.object({
  name: z.string().min(1).optional(),
  tagline: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  logoUrl: z.string().optional(),
  taxEnabled: z.boolean().optional(),
  taxLabel: z.enum(["PB1", "PBJT", "PPN"]).optional(),
  taxRate: z.number().min(0).max(100).optional(), // persen, mis. 10 = 10%
  taxBearer: z.enum(["customer", "cafe"]).optional(),
  serviceChargeEnabled: z.boolean().optional(),
  serviceChargeRate: z.number().min(0).max(100).optional(), // persen
  soundEnabled: z.boolean().optional(),
  openingCash: z.number().min(0).optional(),
  qrTemplate: z.record(z.any()).nullable().optional(),
  theme: z.record(z.any()).nullable().optional(),
  enabledPaymentMethods: z
    .array(z.enum(["cash", "qris", "bank_transfer"]))
    .min(1, "Minimal 1 metode pembayaran harus aktif")
    .optional(),
  paymentSettings: z.record(paymentSettingsValueSchema).optional(),
  midtransMode: z.enum(["global", "custom"]).optional(),
  midtransServerKey: z.string().min(10).optional(),
  midtransClientKey: z.string().optional(),
  // Deprecated: tidak dipakai lagi (Midtrans default gopay). Tetap diterima opsional.
  midtransQrisAcquirer: z.string().optional(),
});

// PATCH /api/business/cash-settings — modal kas & suara (kasir/barista/owner).
// Dipisah dari PUT / (owner-only) agar kasir bisa buka-tutup shift tanpa bisa
// mengubah pajak, harga, maupun pengaturan pembayaran.
// - openingCash: set saat buka shift (sekaligus me-reset closing -> shift baru terbuka)
// - closingCash: set saat tutup shift (null = buka kembali shift)
const cashSettingsSchema = z.object({
  openingCash: z.coerce.number().min(0).optional(),
  closingCash: z.coerce.number().min(0).nullable().optional(),
  soundEnabled: z.boolean().optional(),
});

businessRouter.patch(
  "/cash-settings",
  requireRole("owner", "kasir", "barista"),
  asyncHandler(async (req, res) => {
    const data = cashSettingsSchema.parse(req.body);
    if (Object.keys(data).length === 0) throw AppError.badRequest("Tidak ada field yang diubah");

    const prismaData: Record<string, unknown> = { ...data };
    if (data.openingCash !== undefined) {
      // Buka shift baru: reset closing sebelumnya
      prismaData.closingCash = null;
      prismaData.cashClosedAt = null;
    }
    if (data.closingCash !== undefined && data.closingCash !== null) {
      prismaData.cashClosedAt = new Date();
    }
    if (data.closingCash === null) {
      prismaData.cashClosedAt = null;
    }

    const updated = await prisma.business.update({
      where: { id: req.auth!.businessId },
      data: prismaData,
    });
    emitBusinessCashUpdate(req.auth!.businessId, {
      openingCash: updated.openingCash,
      closingCash: updated.closingCash,
      cashClosedAt: updated.cashClosedAt,
      soundEnabled: updated.soundEnabled,
    });
    res.json({
      openingCash: updated.openingCash,
      closingCash: updated.closingCash,
      cashClosedAt: updated.cashClosedAt,
      soundEnabled: updated.soundEnabled,
    });
  })
);

// PUT /api/business — update profil/identitas/pajak/service charge (khusus owner).
// Field `theme` di-gate flag themePreset (Starter tanpa tema -> 403 bila mengirim theme).
businessRouter.put(
  "/",
  requireRole("owner"),
  asyncHandler(async (req, res, next) => {
    if ((req.body as { theme?: unknown })?.theme !== undefined) {
      const { flags } = await getBusinessFeatures(req.auth!.businessId);
      if (flags[FEATURES.THEME_PRESET] !== true) {
        throw AppError.forbidden(
          "Fitur ini tidak termasuk paket kafe Anda (themePreset). Hubungi tim sales Ordria untuk upgrade."
        );
      }
    }
    next();
  }),
  asyncHandler(async (req, res) => {
    const data = updateBusinessSchema.parse(req.body);
    const { midtransServerKey, midtransClientKey, midtransQrisAcquirer, midtransMode, ...rest } = data as typeof data & {
      midtransServerKey?: string;
      midtransClientKey?: string;
      midtransQrisAcquirer?: string;
      midtransMode?: string;
    };
    const prismaData: Record<string, unknown> = { ...rest };
    if (midtransMode !== undefined) prismaData.midtransMode = midtransMode;
    if (midtransQrisAcquirer !== undefined) prismaData.midtransQrisAcquirer = midtransQrisAcquirer;
    if (midtransClientKey !== undefined) prismaData.midtransClientKey = midtransClientKey;
    if (midtransServerKey !== undefined) {
      const trimmed = midtransServerKey.trim();
      if (trimmed.length > 0 && !isEncrypted(trimmed)) {
        prismaData.midtransServerKeyEnc = encrypt(trimmed);
      }
    }
    const updated = await prisma.business.update({
      where: { id: req.auth!.businessId },
      data: prismaData,
    });
    // Jangan expose encrypted key ke FE
    const { midtransServerKeyEnc: _enc, ...safe } = updated as unknown as Record<string, unknown> & { midtransServerKeyEnc?: string };
    emitBusinessUpdated(req.auth!.businessId, { ...safe, hasMidtransCustomKey: Boolean(_enc) });
    res.json({ ...safe, hasMidtransCustomKey: Boolean(_enc) });
  })
);

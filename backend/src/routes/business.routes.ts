import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth, requireRole } from "../middleware/auth";
import { encrypt, isEncrypted } from "../lib/encryption";

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
  bank: z.enum(["bca", "bni", "bri", "mandiri", "permata", "cimb"]).optional(),
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
  qrTemplate: z.record(z.any()).optional(),
  enabledPaymentMethods: z
    .array(z.enum(["cash", "qris", "ewallet", "bank_transfer"]))
    .min(1, "Minimal 1 metode pembayaran harus aktif")
    .optional(),
  paymentSettings: z.record(paymentSettingsValueSchema).optional(),
  midtransMode: z.enum(["global", "custom"]).optional(),
  midtransServerKey: z.string().min(10).optional(),
  midtransClientKey: z.string().optional(),
  // Deprecated: tidak dipakai lagi (Midtrans default gopay). Tetap diterima opsional.
  midtransQrisAcquirer: z.string().optional(),
});

// PUT /api/business — update profil/identitas/pajak/service charge (khusus owner)
businessRouter.put(
  "/",
  requireRole("owner"),
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
    res.json({ ...safe, hasMidtransCustomKey: Boolean(_enc) });
  })
);

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth, requireRole } from "../middleware/auth";
import { FEATURES, requireFeature } from "../lib/feature-gate";
import { emitStockUpdate } from "../lib/socket";

export const ingredientsRouter = Router();
ingredientsRouter.use(requireAuth);
// Modul inventory hanya paket >= Pro (PRD SaaS §3). GET list ikut di-gate agar
// tenant Starter tidak bisa intip maupun ubah stok via API langsung.
ingredientsRouter.use(requireFeature(FEATURES.INVENTORY));

// GET /api/ingredients
ingredientsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const ingredients = await prisma.ingredient.findMany({
      where: { businessId: req.auth!.businessId },
      orderBy: { name: "asc" },
    });
    res.json(ingredients);
  })
);

const ingredientSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  // coerce: form/Postman mengirim angka sebagai string ("5") — tetap diterima,
  // teks non-angka ("abc") tetap ditolak.
  currentStock: z.coerce.number().min(0).default(0),
  minimumStock: z.coerce.number().min(0).default(0),
  isAvailable: z.boolean().optional(),
});

// POST /api/ingredients — tambah bahan baru (owner/kasir/barista).
// Nonaktifkan (DELETE /:id) tetap owner-only karena destruktif.
ingredientsRouter.post(
  "/",
  requireRole("owner", "kasir", "barista"),
  asyncHandler(async (req, res) => {
    const data = ingredientSchema.parse(req.body);
    const created = await prisma.ingredient.create({
      data: { businessId: req.auth!.businessId, ...data },
    });
    res.status(201).json(created);
  })
);

// PUT /api/ingredients/:id — edit info bahan (owner/kasir/barista).
// Boleh ubah nama, satuan, minimum, isAvailable — tapi TIDAK currentStock
// (stok hanya via POST /:id/movements). Nonaktifkan (DELETE) tetap owner-only.
ingredientsRouter.put(
  "/:id",
  requireRole("owner", "kasir", "barista"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = ingredientSchema.partial().omit({ currentStock: true }).parse(req.body);

    const existing = await prisma.ingredient.findFirst({ where: { id, businessId: req.auth!.businessId } });
    if (!existing) throw AppError.notFound("Bahan tidak ditemukan");

    const updated = await prisma.ingredient.update({ where: { id }, data });
    res.json(updated);
  })
);

// DELETE /api/ingredients/:id — nonaktifkan (owner only)
ingredientsRouter.delete(
  "/:id",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.ingredient.findFirst({ where: { id, businessId: req.auth!.businessId } });
    if (!existing) throw AppError.notFound("Bahan tidak ditemukan");

    const updated = await prisma.ingredient.update({ where: { id }, data: { isAvailable: false } });
    res.json(updated);
  })
);

// GET /api/ingredients/:id/movements — riwayat pergerakan stok
ingredientsRouter.get(
  "/:id/movements",
  asyncHandler(async (req, res) => {
    const ingredientId = Number(req.params.id);
    const movements = await prisma.stockMovement.findMany({
      where: { ingredientId, businessId: req.auth!.businessId },
      orderBy: { createdAt: "desc" },
    });
    res.json(movements);
  })
);

const ADJUSTMENT_REASONS = ["waste_damage", "variance_missing", "internal_promo", "correction"] as const;

const movementSchema = z.object({
  type: z.enum(["in", "out", "adjustment", "waste"]),
  quantity: z.coerce.number(),
  notes: z.string().optional(),
  // Penerimaan supplier (hanya untuk type "in")
  supplier: z.string().max(200).optional(),
  referenceNo: z.string().max(100).optional(),
  unitCost: z.coerce.number().min(0).optional(),
  batchNo: z.string().max(100).optional(),
  expiryDate: z.string().optional(), // ISO date string
  // Penyesuaian (wajib untuk type "adjustment")
  reason: z.enum(ADJUSTMENT_REASONS).optional(),
}).superRefine((data, ctx) => {
  if (data.type === "in" && !(data.quantity > 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Penerimaan harus quantity > 0", path: ["quantity"] });
  }
  if (data.type === "adjustment" && !data.reason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Adjustment wajib pilih reason", path: ["reason"] });
  }
  if (data.type === "adjustment" && data.quantity === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Adjustment tidak boleh nol", path: ["quantity"] });
  }
  if (data.expiryDate !== undefined) {
    const t = Date.parse(data.expiryDate);
    if (Number.isNaN(t)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "expiryDate tidak valid (pakai ISO date)", path: ["expiryDate"] });
    }
  }
});

// POST /api/ingredients/:id/movements — catat stok masuk/keluar/adjustment/waste
// Setiap movement WAJIB tercatat (aturan PRD) — endpoint ini satu-satunya cara ubah current_stock.
// Semua tipe terbuka untuk semua staff (kasir/barista mencatat stok harian);
// audit dijaga via userId + stockBefore/After + notes di tiap baris movement.
// - type "in" (Receive): quantity > 0 + opsional supplier/referenceNo/unitCost/batchNo/expiryDate
// - type "adjustment": quantity +/− (≠ 0) + WAJIB reason (waste_damage|variance_missing|internal_promo|correction)
ingredientsRouter.post(
  "/:id/movements",
  asyncHandler(async (req, res) => {
    const ingredientId = Number(req.params.id);
    const data = movementSchema.parse(req.body);

    const ingredient = await prisma.ingredient.findFirst({
      where: { id: ingredientId, businessId: req.auth!.businessId },
    });
    if (!ingredient) throw AppError.notFound("Bahan tidak ditemukan");

    const stockBefore = Number(ingredient.currentStock);
    const delta =
      data.type === "out" || data.type === "waste" ? -Math.abs(data.quantity) : Math.abs(data.quantity);
    // 'adjustment' bisa naik/turun sesuai quantity yang dikirim (boleh negatif)
    const appliedDelta = data.type === "adjustment" ? data.quantity : delta;
    const stockAfter = stockBefore + appliedDelta;

    if (stockAfter < 0) {
      throw AppError.badRequest("Stok tidak boleh menjadi negatif");
    }

    // Status otomatis mengikuti keterisian stok (tanpa ini bahan yang pernah habis
    // selamanya "Out of Stock" meski sudah receive stock):
    // - stok habis (<= 0) -> isAvailable = false
    // - stok terisi kembali dari kosong -> isAvailable = true (revive)
    // - selain itu hormati flag manual owner (mis. nonaktif karena kualitas)
    const wasEmpty = stockBefore <= 0;
    const isEmpty = stockAfter <= 0;
    const autoAvailable = isEmpty ? false : wasEmpty ? true : undefined;

    const [movement, updatedIngredient] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          businessId: req.auth!.businessId,
          ingredientId,
          type: data.type,
          quantity: data.quantity,
          stockBefore,
          stockAfter,
          notes: data.notes,
          supplier: data.type === "in" ? data.supplier : undefined,
          referenceNo: data.type === "in" ? data.referenceNo : undefined,
          unitCost: data.type === "in" ? data.unitCost : undefined,
          batchNo: data.type === "in" ? data.batchNo : undefined,
          expiryDate: data.type === "in" && data.expiryDate ? new Date(data.expiryDate) : undefined,
          reason: data.type === "adjustment" ? data.reason : undefined,
          userId: req.auth!.userId,
        },
      }),
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: {
          currentStock: stockAfter,
          ...(autoAvailable !== undefined ? { isAvailable: autoAvailable } : {}),
        },
      }),
    ]);

    emitStockUpdate(req.auth!.businessId, updatedIngredient);
    res.status(201).json({ movement, ingredient: updatedIngredient });
  })
);

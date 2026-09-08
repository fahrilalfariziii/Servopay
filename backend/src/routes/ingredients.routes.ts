import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth, requireRole } from "../middleware/auth";
import { emitStockUpdate } from "../lib/socket";

export const ingredientsRouter = Router();
ingredientsRouter.use(requireAuth);

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
  currentStock: z.number().min(0).default(0),
  minimumStock: z.number().min(0).default(0),
  isAvailable: z.boolean().optional(),
});

// POST /api/ingredients — tambah bahan baru (owner only)
ingredientsRouter.post(
  "/",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const data = ingredientSchema.parse(req.body);
    const created = await prisma.ingredient.create({
      data: { businessId: req.auth!.businessId, ...data },
    });
    res.status(201).json(created);
  })
);

// PUT /api/ingredients/:id — edit info bahan (owner only)
ingredientsRouter.put(
  "/:id",
  requireRole("owner"),
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

const movementSchema = z.object({
  type: z.enum(["in", "out", "adjustment", "waste"]),
  quantity: z.number(),
  notes: z.string().optional(),
});

// POST /api/ingredients/:id/movements — catat stok masuk/keluar/adjustment/waste
// Setiap movement WAJIB tercatat (aturan PRD) — endpoint ini satu-satunya cara ubah current_stock.
ingredientsRouter.post(
  "/:id/movements",
  asyncHandler(async (req, res) => {
    const ingredientId = Number(req.params.id);
    const data = movementSchema.parse(req.body);
    // adjustment rawan disalahgunakan untuk menutupi kehilangan stok — batasi owner only
    if (data.type === "adjustment" && req.auth!.role !== "owner") {
      throw AppError.forbidden("Adjustment stok hanya boleh dilakukan owner");
    }

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
          userId: req.auth!.userId,
        },
      }),
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: { currentStock: stockAfter },
      }),
    ]);

    emitStockUpdate(req.auth!.businessId, updatedIngredient);
    res.status(201).json({ movement, ingredient: updatedIngredient });
  })
);

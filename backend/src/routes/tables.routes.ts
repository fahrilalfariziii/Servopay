import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth, requireRole } from "../middleware/auth";

export const tablesRouter = Router();
tablesRouter.use(requireAuth);

// GET /api/tables — semua role staff boleh lihat (untuk cetak QR / referensi order)
tablesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const tables = await prisma.cafeTable.findMany({
      where: { businessId: req.auth!.businessId },
      orderBy: { id: "asc" },
    });
    res.json(tables);
  })
);

const createTableSchema = z.object({
  tableNumber: z.string().min(1),
  area: z.string().optional(),
  qrConfig: z.record(z.any()).optional(),
});

// POST /api/tables — owner only
tablesRouter.post(
  "/",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const data = createTableSchema.parse(req.body);
    const created = await prisma.cafeTable.create({
      data: {
        businessId: req.auth!.businessId,
        tableNumber: data.tableNumber,
        area: data.area,
        qrConfig: data.qrConfig,
        qrToken: crypto.randomBytes(12).toString("hex"),
        isActive: true,
      },
    });
    res.status(201).json(created);
  })
);

const updateTableSchema = createTableSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// PUT /api/tables/:id — owner only
tablesRouter.put(
  "/:id",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = updateTableSchema.parse(req.body);

    const existing = await prisma.cafeTable.findFirst({ where: { id, businessId: req.auth!.businessId } });
    if (!existing) throw AppError.notFound("Meja tidak ditemukan");

    const updated = await prisma.cafeTable.update({ where: { id }, data });
    res.json(updated);
  })
);

// POST /api/tables/:id/regenerate-qr — owner only, ganti token QR (mis. QR bocor)
tablesRouter.post(
  "/:id/regenerate-qr",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.cafeTable.findFirst({ where: { id, businessId: req.auth!.businessId } });
    if (!existing) throw AppError.notFound("Meja tidak ditemukan");

    const updated = await prisma.cafeTable.update({
      where: { id },
      data: { qrToken: crypto.randomBytes(12).toString("hex") },
    });
    res.json(updated);
  })
);

// DELETE /api/tables/:id — owner only
tablesRouter.delete(
  "/:id",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.cafeTable.findFirst({ where: { id, businessId: req.auth!.businessId } });
    if (!existing) throw AppError.notFound("Meja tidak ditemukan");

    await prisma.cafeTable.delete({ where: { id } });
    res.status(204).send();
  })
);

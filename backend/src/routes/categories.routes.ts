import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth, requireRole } from "../middleware/auth";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

// GET /api/categories
categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { businessId: req.auth!.businessId },
      orderBy: { sortOrder: "asc" },
    });
    res.json(categories);
  })
);

const categorySchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// POST /api/categories — owner only
categoriesRouter.post(
  "/",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const data = categorySchema.parse(req.body);
    const created = await prisma.category.create({
      data: { businessId: req.auth!.businessId, ...data },
    });
    res.status(201).json(created);
  })
);

// PUT /api/categories/:id — owner only
categoriesRouter.put(
  "/:id",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = categorySchema.partial().parse(req.body);

    const existing = await prisma.category.findFirst({ where: { id, businessId: req.auth!.businessId } });
    if (!existing) throw AppError.notFound("Kategori tidak ditemukan");

    const updated = await prisma.category.update({ where: { id }, data });
    res.json(updated);
  })
);

// DELETE /api/categories/:id — owner only
categoriesRouter.delete(
  "/:id",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.category.findFirst({ where: { id, businessId: req.auth!.businessId } });
    if (!existing) throw AppError.notFound("Kategori tidak ditemukan");

    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  })
);

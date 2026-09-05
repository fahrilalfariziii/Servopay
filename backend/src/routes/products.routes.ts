import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth, requireRole } from "../middleware/auth";
import { emitProductAvailabilityUpdate } from "../lib/socket";

export const productsRouter = Router();
productsRouter.use(requireAuth);

// GET /api/products — daftar menu untuk Frontoffice/BackOffice (termasuk yang Out of Stock)
productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany({
      where: { businessId: req.auth!.businessId },
      include: { options: true, category: true },
      orderBy: { id: "asc" },
    });
    res.json(products);
  })
);

const productSchema = z.object({
  categoryId: z.number().int(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  hpp: z.number().min(0).optional(),
  imageUrl: z.string().optional(),
  badge: z.string().optional(),
  isAvailable: z.boolean().optional(),
});

// POST /api/products — owner only
productsRouter.post(
  "/",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);

    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, businessId: req.auth!.businessId },
    });
    if (!category) throw AppError.badRequest("categoryId tidak valid untuk bisnis ini");

    const created = await prisma.product.create({
      data: { businessId: req.auth!.businessId, ...data },
      include: { options: true },
    });
    res.status(201).json(created);
  })
);

// PUT /api/products/:id — owner only (edit lengkap)
productsRouter.put(
  "/:id",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = productSchema.partial().parse(req.body);

    const existing = await prisma.product.findFirst({ where: { id, businessId: req.auth!.businessId } });
    if (!existing) throw AppError.notFound("Produk tidak ditemukan");

    const updated = await prisma.product.update({ where: { id }, data, include: { options: true } });
    res.json(updated);
  })
);

// PATCH /api/products/:id/availability — owner/kasir/barista boleh toggle cepat Out of Stock
productsRouter.patch(
  "/:id/availability",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { isAvailable } = z.object({ isAvailable: z.boolean() }).parse(req.body);

    const existing = await prisma.product.findFirst({ where: { id, businessId: req.auth!.businessId } });
    if (!existing) throw AppError.notFound("Produk tidak ditemukan");

    const updated = await prisma.product.update({ where: { id }, data: { isAvailable } });
    emitProductAvailabilityUpdate(req.auth!.businessId, updated);
    res.json(updated);
  })
);

// DELETE /api/products/:id — owner only
productsRouter.delete(
  "/:id",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.product.findFirst({ where: { id, businessId: req.auth!.businessId } });
    if (!existing) throw AppError.notFound("Produk tidak ditemukan");

    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  })
);

// ---- Nested: product options (varian & add-ons) ----

const optionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["temperature", "sugar", "ice", "milk", "addon"]),
  price: z.number().min(0).default(0),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// POST /api/products/:productId/options — owner only
productsRouter.post(
  "/:productId/options",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.productId);
    const data = optionSchema.parse(req.body);

    const product = await prisma.product.findFirst({
      where: { id: productId, businessId: req.auth!.businessId },
    });
    if (!product) throw AppError.notFound("Produk tidak ditemukan");

    const created = await prisma.productOption.create({ data: { productId, ...data } });
    res.status(201).json(created);
  })
);

// PUT /api/products/:productId/options/:optionId — owner only
productsRouter.put(
  "/:productId/options/:optionId",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.productId);
    const optionId = Number(req.params.optionId);
    const data = optionSchema.partial().parse(req.body);

    const option = await prisma.productOption.findFirst({
      where: { id: optionId, productId, product: { businessId: req.auth!.businessId } },
    });
    if (!option) throw AppError.notFound("Opsi tidak ditemukan");

    const updated = await prisma.productOption.update({ where: { id: optionId }, data });
    res.json(updated);
  })
);

// DELETE /api/products/:productId/options/:optionId — owner only
productsRouter.delete(
  "/:productId/options/:optionId",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.productId);
    const optionId = Number(req.params.optionId);

    const option = await prisma.productOption.findFirst({
      where: { id: optionId, productId, product: { businessId: req.auth!.businessId } },
    });
    if (!option) throw AppError.notFound("Opsi tidak ditemukan");

    await prisma.productOption.delete({ where: { id: optionId } });
    res.status(204).send();
  })
);

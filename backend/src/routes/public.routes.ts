import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../middleware/error-handler";
import { createOrder } from "../services/order.service";

export const publicRouter = Router();

// GET /api/public/tables/:qrToken
// Dipanggil saat pelanggan scan QR — resolve meja + info bisnis (untuk header & kalkulasi pajak/service di cart).
publicRouter.get(
  "/tables/:qrToken",
  asyncHandler(async (req, res) => {
    const table = await prisma.cafeTable.findUnique({
      where: { qrToken: req.params.qrToken },
      include: { business: true },
    });

    if (!table || !table.isActive) {
      throw AppError.notFound("QR meja tidak valid atau tidak aktif");
    }

    res.json({
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        area: table.area,
        qrConfig: table.qrConfig,
      },
      business: {
        id: table.business.id,
        name: table.business.name,
        tagline: table.business.tagline,
        logoUrl: table.business.logoUrl,
        taxEnabled: table.business.taxEnabled,
        taxLabel: table.business.taxLabel,
        taxRate: table.business.taxRate,
        taxBearer: table.business.taxBearer,
        serviceChargeEnabled: table.business.serviceChargeEnabled,
        serviceChargeRate: table.business.serviceChargeRate,
      },
    });
  })
);

// GET /api/public/businesses/:businessId/catalog
// Katalog untuk pelanggan: hanya kategori aktif & produk yang tersedia.
publicRouter.get(
  "/businesses/:businessId/catalog",
  asyncHandler(async (req, res) => {
    const businessId = Number(req.params.businessId);

    const categories = await prisma.category.findMany({
      where: { businessId, isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          include: { options: { where: { isActive: true } } },
        },
      },
    });

    res.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        products: c.products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          imageUrl: p.imageUrl,
          isAvailable: p.isAvailable,
          badge: p.badge,
          options: p.options,
        })),
      }))
    );
  })
);

const createSelfOrderSchema = z.object({
  qrToken: z.string().min(1),
  clientOrderId: z.string().min(1).optional(),
  customerName: z.string().min(1),
  paymentMethod: z.enum(["cash", "qris"]),
  items: z
    .array(
      z.object({
        productId: z.number().int(),
        quantity: z.number().int().min(1),
        selectedOptionIds: z.array(z.number().int()).optional(),
      })
    )
    .min(1),
});

// POST /api/public/orders — checkout dari Self-Order pelanggan
publicRouter.post(
  "/orders",
  asyncHandler(async (req, res) => {
    const data = createSelfOrderSchema.parse(req.body);

    const table = await prisma.cafeTable.findUnique({ where: { qrToken: data.qrToken } });
    if (!table || !table.isActive) {
      throw AppError.badRequest("QR meja tidak valid atau tidak aktif");
    }

    const order = await createOrder({
      businessId: table.businessId,
      clientOrderId: data.clientOrderId ?? crypto.randomUUID(),
      tableId: table.id,
      customerName: data.customerName,
      source: "self_order",
      paymentMethod: data.paymentMethod,
      items: data.items,
    });

    res.status(201).json(order);
  })
);

// GET /api/public/orders/:clientOrderId — polling status live order (fallback selain socket)
publicRouter.get(
  "/orders/:clientOrderId",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { clientOrderId: req.params.clientOrderId },
      include: { items: true, statusLogs: { orderBy: { createdAt: "asc" } } },
    });
    if (!order) throw AppError.notFound("Order tidak ditemukan");
    res.json(order);
  })
);

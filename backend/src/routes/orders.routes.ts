import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth } from "../middleware/auth";
import { createOrder, updateOrderStatus, markOrderPaid } from "../services/order.service";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const listQuerySchema = z.object({
  status: z.enum(["diterima", "diproses", "siap", "selesai"]).optional(),
  source: z.enum(["self_order", "pos"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "failed"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// GET /api/orders — feed order Frontoffice, bisa difilter
ordersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const orders = await prisma.order.findMany({
      where: {
        businessId: req.auth!.businessId,
        status: query.status,
        source: query.source,
        paymentStatus: query.paymentStatus,
      },
      include: { items: true, payments: true, table: true },
      orderBy: { createdAt: "desc" },
      take: query.limit,
    });
    res.json(orders);
  })
);

// GET /api/orders/:id
ordersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const order = await prisma.order.findFirst({
      where: { id, businessId: req.auth!.businessId },
      include: { items: true, payments: true, statusLogs: true, table: true },
    });
    if (!order) throw AppError.notFound("Order tidak ditemukan");
    res.json(order);
  })
);

const createManualOrderSchema = z.object({
  clientOrderId: z.string().min(1).optional(),
  tableId: z.number().int().optional().nullable(),
  customerName: z.string().optional(),
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

// POST /api/orders — input pesanan manual oleh kasir/barista (Frontoffice)
ordersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createManualOrderSchema.parse(req.body);

    const order = await createOrder({
      businessId: req.auth!.businessId,
      clientOrderId: data.clientOrderId ?? crypto.randomUUID(),
      tableId: data.tableId ?? null,
      userId: req.auth!.userId,
      customerName: data.customerName ?? null,
      source: "pos",
      paymentMethod: data.paymentMethod,
      items: data.items,
    });

    res.status(201).json(order);
  })
);

const statusSchema = z.object({ status: z.enum(["diterima", "diproses", "siap", "selesai"]) });

// PATCH /api/orders/:id/status
ordersRouter.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { status } = statusSchema.parse(req.body);
    const updated = await updateOrderStatus(req.auth!.businessId, id, status);
    res.json(updated);
  })
);

const paySchema = z.object({
  method: z.enum(["cash", "qris"]).optional(),
  reference: z.string().optional(),
});

// PATCH /api/orders/:id/pay — kasir verifikasi/mencatat pembayaran lunas
ordersRouter.patch(
  "/:id/pay",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = paySchema.parse(req.body);
    const updated = await markOrderPaid(req.auth!.businessId, id, data);
    res.json(updated);
  })
);

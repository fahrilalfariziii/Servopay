import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth, requireRole } from "../middleware/auth";

export const businessRouter = Router();
businessRouter.use(requireAuth);

// GET /api/business — profil bisnis milik user yang login (semua role boleh baca)
businessRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const business = await prisma.business.findUnique({ where: { id: req.auth!.businessId } });
    if (!business) throw AppError.notFound("Bisnis tidak ditemukan");
    res.json(business);
  })
);

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
});

// PUT /api/business — update profil/identitas/pajak/service charge (khusus owner)
businessRouter.put(
  "/",
  requireRole("owner"),
  asyncHandler(async (req, res) => {
    const data = updateBusinessSchema.parse(req.body);
    const updated = await prisma.business.update({
      where: { id: req.auth!.businessId },
      data,
    });
    res.json(updated);
  })
);

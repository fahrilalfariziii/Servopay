import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { hashPassword, isStrongPassword } from "../lib/password";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth, requireRole } from "../middleware/auth";

export const staffRouter = Router();
staffRouter.use(requireAuth, requireRole("owner"));

function toPublicStaff(u: { id: number; name: string; email: string; role: string; active: boolean }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active };
}

// GET /api/staff
staffRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const staff = await prisma.user.findMany({
      where: { businessId: req.auth!.businessId },
      orderBy: { id: "asc" },
    });
    res.json(staff.map(toPublicStaff));
  })
);

const createStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().refine(isStrongPassword, {
    message: "Password minimal 8 karakter, mengandung huruf, angka, dan simbol",
  }),
  role: z.enum(["owner", "kasir", "barista"]),
});

// POST /api/staff
staffRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createStaffSchema.parse(req.body);

    const passwordHash = await hashPassword(data.password);
    const created = await prisma.user.create({
      data: {
        businessId: req.auth!.businessId,
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash,
        active: true,
      },
    });
    res.status(201).json(toPublicStaff(created));
  })
);

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["owner", "kasir", "barista"]).optional(),
  active: z.boolean().optional(),
  password: z
    .string()
    .refine(isStrongPassword, {
      message: "Password minimal 8 karakter, mengandung huruf, angka, dan simbol",
    })
    .optional(),
});

// PUT /api/staff/:id
staffRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = updateStaffSchema.parse(req.body);

    const existing = await prisma.user.findFirst({ where: { id, businessId: req.auth!.businessId } });
    if (!existing) throw AppError.notFound("Staff tidak ditemukan");

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        active: data.active,
        passwordHash: data.password ? await hashPassword(data.password) : undefined,
      },
    });
    res.json(toPublicStaff(updated));
  })
);

// DELETE /api/staff/:id — soft delete (nonaktifkan), bukan hapus permanen
staffRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.user.findFirst({ where: { id, businessId: req.auth!.businessId } });
    if (!existing) throw AppError.notFound("Staff tidak ditemukan");

    const updated = await prisma.user.update({ where: { id }, data: { active: false } });
    res.json(toPublicStaff(updated));
  })
);

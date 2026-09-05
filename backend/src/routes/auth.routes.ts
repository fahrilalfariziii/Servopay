import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { comparePassword } from "../lib/password";
import { signAuthToken } from "../lib/jwt";
import { AppError } from "../lib/errors";
import { asyncHandler } from "../middleware/error-handler";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/login
// Sama seperti frontend: tidak ada dropdown role, role otomatis terdeteksi dari user.
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      throw AppError.unauthorized("Email atau password salah");
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw AppError.unauthorized("Email atau password salah");
    }

    const token = signAuthToken({
      userId: user.id,
      businessId: user.businessId,
      role: user.role as "owner" | "kasir" | "barista",
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
    });
  })
);

// GET /api/auth/me
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) throw AppError.notFound("User tidak ditemukan");

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      businessId: user.businessId,
    });
  })
);

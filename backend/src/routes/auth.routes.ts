import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
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

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Terlalu banyak percobaan login, coba lagi nanti" },
  keyGenerator: (req) => `${ipKeyGenerator(req.ip as string)}-${String((req.body as { email?: string })?.email || "").toLowerCase()}`,
});

// POST /api/auth/login
// Sama seperti frontend: tidak ada dropdown role, role otomatis terdeteksi dari user.
authRouter.post(
  "/login",
  loginLimiter,
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

    // Set httpOnly cookie (lebih tahan XSS daripada localStorage) + tetap return token untuk backward compat
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 12 * 60 * 60 * 1000,
      path: "/",
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

// POST /api/auth/logout — hapus httpOnly cookie
authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    res.clearCookie("token", { path: "/" });
    res.json({ status: "ok" });
  })
);

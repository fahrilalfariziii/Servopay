import { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../lib/jwt";
import { AppError } from "../lib/errors";
import { AuthTokenPayload } from "../lib/jwt";
import { prisma } from "../lib/prisma";

/**
 * Wajib login (role apapun). Mengisi req.auth = { userId, businessId, role }.
 * Setelah verifikasi JWT, cek DB: user masih active dan role masih sama — staff yang
 * dinonaktifkan/didemote langsung kehilangan akses tanpa tunggu token 12h.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  let token: string | undefined;

  if (header && header.startsWith("Bearer ")) {
    token = header.slice("Bearer ".length).trim();
  } else if ((req as unknown as { cookies?: Record<string, string> }).cookies?.token) {
    token = (req as unknown as { cookies: Record<string, string> }).cookies.token;
  }

  if (!token) {
    return next(AppError.unauthorized("Header Authorization Bearer <token> wajib diisi atau login via cookie"));
  }

  let payload: AuthTokenPayload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    return next(AppError.unauthorized("Token tidak valid atau kadaluarsa"));
  }

  // Token platform admin tidak berlaku untuk endpoint tenant (isolasi sesi, PRD §8.2).
  if (payload.scope === "platform") {
    return next(AppError.unauthorized("Sesi platform admin tidak berlaku di sini, silakan login akun kafe"));
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.active) return next(AppError.unauthorized("Akun tidak aktif"));
    if (user.role !== payload.role) return next(AppError.unauthorized("Role tidak lagi valid, silakan login ulang"));
    if (user.businessId !== payload.businessId) return next(AppError.unauthorized("Akses bisnis tidak valid"));
    req.auth = payload;
    return next();
  } catch (e) {
    return next(e);
  }
}

/**
 * Batasi endpoint hanya untuk role tertentu. Panggil setelah requireAuth.
 * Contoh: router.post("/staff", requireAuth, requireRole("owner"), handler)
 */
export function requireRole(...roles: AuthTokenPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(AppError.unauthorized());
    }
    if (!roles.includes(req.auth.role)) {
      return next(AppError.forbidden(`Role '${req.auth.role}' tidak diizinkan mengakses endpoint ini`));
    }
    return next();
  };
}

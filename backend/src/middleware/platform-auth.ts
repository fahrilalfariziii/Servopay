import { NextFunction, Request, Response } from "express";
import { verifyPlatformToken, PlatformAdminRole } from "../lib/jwt";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";

/**
 * Wajib login platform admin (superadmin/support). Mengisi
 * req.platformAdmin = { adminId, role }.
 * Token tenant (scope tenant/tanpa scope) DITOLAK di sini — isolasi sesi PRD §8.2.
 * Cookie memakai nama "platform_token" (bukan "token") agar tidak tertukar
 * dengan sesi tenant saat keduanya dibuka di browser yang sama.
 */
export async function requirePlatformAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  let token: string | undefined;

  if (header && header.startsWith("Bearer ")) {
    token = header.slice("Bearer ".length).trim();
  } else if ((req as unknown as { cookies?: Record<string, string> }).cookies?.platform_token) {
    token = (req as unknown as { cookies: Record<string, string> }).cookies.platform_token;
  }

  if (!token) {
    return next(AppError.unauthorized("Header Authorization Bearer <token> wajib diisi atau login via cookie"));
  }

  try {
    const payload = verifyPlatformToken(token);
    const admin = await prisma.platformAdmin.findUnique({ where: { id: payload.adminId } });
    if (!admin || !admin.active) return next(AppError.unauthorized("Akun tidak aktif"));
    if (admin.role !== payload.role) return next(AppError.unauthorized("Role tidak lagi valid, silakan login ulang"));
    req.platformAdmin = { adminId: admin.id, role: admin.role as PlatformAdminRole };
    return next();
  } catch {
    return next(AppError.unauthorized("Token tidak valid atau kadaluarsa"));
  }
}

/**
 * Batasi endpoint hanya untuk role platform tertentu (mis. superadmin untuk billing).
 * Panggil setelah requirePlatformAuth.
 */
export function requirePlatformRole(...roles: PlatformAdminRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.platformAdmin) {
      return next(AppError.unauthorized());
    }
    if (!roles.includes(req.platformAdmin.role)) {
      return next(AppError.forbidden(`Role '${req.platformAdmin.role}' tidak diizinkan mengakses endpoint ini`));
    }
    return next();
  };
}

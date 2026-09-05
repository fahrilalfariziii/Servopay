import { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../lib/jwt";
import { AppError } from "../lib/errors";
import { AuthTokenPayload } from "../lib/jwt";

/**
 * Wajib login (role apapun). Mengisi req.auth = { userId, businessId, role }.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(AppError.unauthorized("Header Authorization Bearer <token> wajib diisi"));
  }

  const token = header.slice("Bearer ".length);

  try {
    req.auth = verifyAuthToken(token);
    return next();
  } catch {
    return next(AppError.unauthorized("Token tidak valid atau kadaluarsa"));
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

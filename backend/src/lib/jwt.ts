import jwt from "jsonwebtoken";

export type TokenScope = "tenant" | "platform";

export interface AuthTokenPayload {
  userId: number;
  businessId: number;
  role: "owner" | "kasir" | "barista";
  // Token lama (pra-Fase 3) tidak punya scope -> diperlakukan sebagai "tenant".
  scope?: TokenScope;
}

export type PlatformAdminRole = "superadmin" | "support";

export interface PlatformTokenPayload {
  adminId: number;
  role: PlatformAdminRole;
  scope: "platform";
}

const SECRET = process.env.JWT_SECRET as string;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";

if (!SECRET) {
  // Gagal cepat saat boot kalau lupa set .env, daripada diam-diam tidak aman.
  throw new Error("JWT_SECRET belum di-set di environment (.env)");
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, SECRET) as AuthTokenPayload;
}

const PLATFORM_EXPIRES_IN = process.env.PLATFORM_JWT_EXPIRES_IN || "12h";

export function signPlatformToken(payload: { adminId: number; role: PlatformAdminRole }): string {
  return jwt.sign({ ...payload, scope: "platform" }, SECRET, { expiresIn: PLATFORM_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyPlatformToken(token: string): PlatformTokenPayload {
  const decoded = jwt.verify(token, SECRET) as Partial<PlatformTokenPayload>;
  if (decoded.scope !== "platform" || typeof decoded.adminId !== "number") {
    throw new Error("Bukan token platform admin");
  }
  return decoded as PlatformTokenPayload;
}

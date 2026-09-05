import jwt from "jsonwebtoken";

export interface AuthTokenPayload {
  userId: number;
  businessId: number;
  role: "owner" | "kasir" | "barista";
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

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Sama seperti aturan di frontend (StaffPage.tsx / ProfileSettingsPage.tsx):
// minimal 6 karakter, mengandung huruf, angka, dan simbol.
const STRONG_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

export function isStrongPassword(plain: string): boolean {
  return STRONG_PASSWORD_REGEX.test(plain);
}

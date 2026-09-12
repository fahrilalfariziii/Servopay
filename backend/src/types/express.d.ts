import { AuthTokenPayload, PlatformAdminRole } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
      platformAdmin?: { adminId: number; role: PlatformAdminRole };
    }
  }
}

export {};

import type { Request, Response } from "express";
import { createApp } from "../src/app";

// Entry khusus Vercel Functions (serverless). Aditif: src/index.ts
// (long-running listen untuk Hostinger/VPS/Docker) TIDAK diubah.
// Vercel me-rewrite semua path ke sini via backend/vercel.json.
const app = createApp();

export default function handler(req: Request, res: Response): void {
  app(req, res);
}

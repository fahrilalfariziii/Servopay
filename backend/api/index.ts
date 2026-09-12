import { createApp } from "../src/app";

// Entry khusus Vercel Functions (serverless)
const app = createApp();

// Export langsung instance Express-nya
export default app;
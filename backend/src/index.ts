import "dotenv/config";
import http from "http";
import { createApp } from "./app";
import { initSocket } from "./lib/socket";

const PORT = Number(process.env.PORT) || 4000;

const app = createApp();
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`Ordria backend jalan di http://localhost:${PORT}`);
  console.log(`Health check:      http://localhost:${PORT}/health`);
  console.log(`API base:          http://localhost:${PORT}/api`);
});

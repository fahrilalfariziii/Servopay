import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAuthToken } from "./jwt";

let io: SocketIOServer | null = null;

/**
 * Setiap koneksi wajib join ke room "business:<id>" supaya event hanya
 * dikirim ke client yang berhak (satu bisnis = satu room).
 *
 * Cara client join (tanpa perlu auth untuk layar Self-Order publik):
 *   const socket = io(SERVER_URL);
 *   socket.emit("join", { businessId: 1, tableToken: "abc" }); // pelanggan
 *   socket.emit("join", { businessId: 1, token: JWT });        // staff (Frontoffice/BackOffice)
 */
export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: (process.env.CORS_ORIGIN || "*").split(","),
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    socket.on("join", (payload: { businessId?: number; token?: string }) => {
      let businessId = payload?.businessId;

      // Kalau staff mengirim JWT, validasi & pakai businessId dari token
      // supaya tidak bisa asal join room bisnis lain.
      if (payload?.token) {
        try {
          const decoded = verifyAuthToken(payload.token);
          businessId = decoded.businessId;
        } catch {
          socket.emit("join_error", { message: "Token tidak valid" });
          return;
        }
      }

      if (!businessId) {
        socket.emit("join_error", { message: "businessId wajib diisi" });
        return;
      }

      socket.join(roomFor(businessId));
      socket.emit("joined", { businessId });
    });

    socket.on("disconnect", () => {
      // no-op — socket.io otomatis membersihkan room membership
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.io belum diinisialisasi. Panggil initSocket() dulu di index.ts");
  }
  return io;
}

function roomFor(businessId: number): string {
  return `business:${businessId}`;
}

// ---- Event emitter helpers dipanggil dari services/controllers ----

export function emitNewOrder(businessId: number, order: unknown) {
  io?.to(roomFor(businessId)).emit("order:new", order);
}

export function emitOrderStatusUpdate(businessId: number, order: unknown) {
  io?.to(roomFor(businessId)).emit("order:status_updated", order);
}

export function emitOrderPaymentUpdate(businessId: number, order: unknown) {
  io?.to(roomFor(businessId)).emit("order:payment_updated", order);
}

export function emitProductAvailabilityUpdate(businessId: number, product: unknown) {
  io?.to(roomFor(businessId)).emit("product:availability_updated", product);
}

export function emitStockUpdate(businessId: number, ingredient: unknown) {
  io?.to(roomFor(businessId)).emit("ingredient:stock_updated", ingredient);
}

import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAuthToken } from "./jwt";
import { prisma } from "./prisma";

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
  const raw = process.env.CORS_ORIGIN;
  const origins = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : ["http://localhost:5173"];
  io = new SocketIOServer(server, {
    cors: {
      origin: origins,
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    socket.on("join", async (payload: { businessId?: number; token?: string; qrToken?: string; tableToken?: string }) => {
      let businessId = payload?.businessId;

      // Staff: pakai businessId dari JWT, jangan percaya kiriman client
      if (payload?.token) {
        try {
          const decoded = verifyAuthToken(payload.token);
          businessId = decoded.businessId;
        } catch {
          socket.emit("join_error", { message: "Token tidak valid" });
          return;
        }
      } else {
        // Pelanggan self-order: wajib kirim qrToken meja, resolve businessId via DB (sama seperti GET /public/tables/:qrToken)
        const qrToken = payload?.qrToken ?? payload?.tableToken;
        if (!qrToken) {
          socket.emit("join_error", { message: "qrToken wajib diisi untuk pelanggan" });
          return;
        }
        const table = await prisma.cafeTable.findUnique({ where: { qrToken } });
        if (!table || !table.isActive) {
          socket.emit("join_error", { message: "QR meja tidak valid atau tidak aktif" });
          return;
        }
        businessId = table.businessId;
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

export function emitBusinessCashUpdate(businessId: number, cash: unknown) {
  io?.to(roomFor(businessId)).emit("business:cash_updated", cash);
}

export function emitBusinessUpdated(businessId: number, business: unknown) {
  io?.to(roomFor(businessId)).emit("business:updated", business);
}

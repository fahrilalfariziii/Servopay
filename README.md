# PROJECT COFFEE SHOP MANAGEMENT (Servopay)

## 1. Overview

Aplikasi ini bertujuan untuk mendigitalkan dan menyederhanakan proses pemesanan coffee shop, mulai dari pelanggan melakukan self-order melalui QR Code di meja, pesanan masuk secara real-time ke kasir/barista, proses pembayaran, hingga pengelolaan menu, meja, stok, dan analitik oleh owner.

Sistem dirancang sebagai **Web App** dengan tiga area utama, yaitu **Halaman Pemesanan Pelanggan (Self-Ordering App)**, **Halaman Frontoffice (Kasir / Barista)**, dan **Halaman BackOffice (Owner — Analytics & Management)**. Fokus utama sistem adalah mempercepat proses pemesanan, mengurangi kesalahan input manual, menyediakan status pesanan secara real-time, dan memberikan owner data penjualan yang mudah dipantau.

Spesifikasi lengkap ada di `docs/prd_POS_updated.md` (skema 12 tabel, alur Self-Order/Frontoffice/BackOffice, aturan pajak/service, offline, payment).

## 2. Struktur monorepo

```
servopay/
├── docs/                 # PRD + dokumentasi produk
├── backend/              # REST API + Realtime + Midtrans (Node.js/Express/Prisma/Postgres)
│   └── README.md         # setup, akun seed, SEMUA endpoint + contoh curl/Postman, Midtrans
├── frontend/             # Web App (React/Vite/Tailwind, mock in-memory)
│   └── README.md         # setup, akun demo, rute per role, aturan bisnis, struktur folder
└── README.md             # file ini
```

## 3. Status integrasi

- **Backend berdiri sendiri** — semua endpoint bisa dites langsung via curl/Postman tanpa frontend
  (lihat `backend/README.md` §3: health, auth, self-order publik, orders, business, staff, tables,
  products, ingredients, analytics, webhook Midtrans).
- **Frontend masih mock in-memory** (`CafeProvider`, belum fetch API backend).
  Seed data disamakan dua sisi (`backend/prisma/seed.ts` ↔ `frontend/src/mock/data.ts`:
  bisnis Bean & Brew, staff Owner123!/Kasir123!/Barista123!, menu, meja `table-01..06`).
- **Tahap berikutnya:** sambungkan FE→BE (checkout real + QR Midtrans asli + polling/socket status paid).

## 4. Cara jalan cepat (dev, dua terminal)

```bash
# Terminal 1 — backend (http://localhost:4000)
cd backend
cp .env.example .env
npm install
docker compose up -d        # Postgres + Adminer :8081
npx prisma generate
npx prisma migrate dev      # atau --name add_midtrans_hybrid untuk migrasi terbaru
npm run seed
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
# Self-Order: http://localhost:5173/servopay/order/table-01
# Login:      http://localhost:5173/servopay/login
```

## 5. Dokumentasi per sisi

- Backend: buka `backend/README.md` — stack, setup, akun seed, alur testing per endpoint (curl),
  daftar endpoint lengkap, aturan bisnis, Midtrans (charge/webhook/ngrok), menuju production.
- Frontend: buka `frontend/README.md` — stack, akun demo, rute per role, aturan bisnis mirror backend,
  struktur folder aktual.

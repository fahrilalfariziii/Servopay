# Servopay Backend

Backend REST API + Realtime untuk aplikasi Coffee Shop Management (Self-Order, Frontoffice/POS,
BackOffice/Owner), dibangun sesuai skema & aturan bisnis di `../docs/prd_POS_updated.md`.

Project ini **berdiri sendiri** — belum disambungkan ke `../frontend`. Semua endpoint bisa dites
langsung lewat curl/Postman/Insomnia.

## Stack

- **Node.js + Express + TypeScript**
- **PostgreSQL** (lewat Docker Compose untuk development)
- **Prisma ORM** — schema & migrasi type-safe, gampang dipindah ke Postgres managed apa pun nanti
- **JWT + bcrypt** — autentikasi & hashing password sendiri (tidak bergantung ke Supabase Auth)
- **Socket.io** — realtime order baru & perubahan status

## 1. Setup

```bash
cd backend
cp .env.example .env
npm install

# Nyalakan PostgreSQL (+ Adminer, GUI DB via browser di http://localhost:8081)
docker compose up -d

# Generate Prisma Client dari schema.prisma
npx prisma generate

# Buat tabel-tabel di database (migrasi pertama)
npx prisma migrate dev --name init

# Isi data contoh (business "Bean & Brew", staff, menu, meja, bahan, 2 contoh order)
npm run seed

# Jalankan server dengan auto-reload
npm run dev
```

Server jalan di `http://localhost:4000`. Cek `GET http://localhost:4000/health` untuk memastikan hidup.

> **Catatan Docker:** kalau `docker compose` tidak tersedia, ganti dengan PostgreSQL lokal apa pun,
> lalu sesuaikan `DATABASE_URL` di `.env`. Prisma tidak peduli Postgres-nya jalan di Docker,
> instalasi lokal, atau managed service — schema & migrasi tetap sama persis.

## 2. Akun hasil seed

| Role    | Email               | Password    |
| ------- | ------------------- | ----------- |
| Owner   | owner@beanbrew.id   | Owner123!   |
| Kasir   | kasir@beanbrew.id   | Kasir123!   |
| Barista | barista@beanbrew.id | Barista123! |

QR token meja contoh: `table-01` s/d `table-06` (table-06 nonaktif).

## 3. Alur testing tanpa frontend

**Sebagai staff (Frontoffice/BackOffice):**

```bash
# 1. Login
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@beanbrew.id","password":"Owner123!"}'
# -> simpan "token" dari response

TOKEN="<paste token di sini>"

# 2. Lihat order masuk
curl -s http://localhost:4000/api/orders -H "Authorization: Bearer $TOKEN"

# 3. Ubah status order
curl -s -X PATCH http://localhost:4000/api/orders/1/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"diproses"}'
```

**Sebagai pelanggan (Self-Order, tanpa login):**

```bash
# 1. Scan QR -> resolve meja & pengaturan pajak/service
curl -s http://localhost:4000/api/public/tables/table-01

# 2. Lihat katalog (pakai businessId dari response di atas)
curl -s http://localhost:4000/api/public/businesses/1/catalog

# 3. Checkout
curl -s -X POST http://localhost:4000/api/public/orders \
  -H "Content-Type: application/json" \
  -d '{
    "qrToken": "table-01",
    "customerName": "Budi",
    "paymentMethod": "qris",
    "items": [{ "productId": 1, "quantity": 1, "selectedOptionIds": [2, 4] }]
  }'
```

**Realtime (Socket.io):** hubungkan ke server lalu `emit("join", { businessId: 1 })` (atau
`{ token: JWT }` untuk staff), lalu dengarkan event `order:new`, `order:status_updated`,
`order:payment_updated`, `product:availability_updated`, `ingredient:stock_updated`.

## 4. Struktur folder

```
backend/
├── prisma/
│   ├── schema.prisma      # 12 tabel sesuai ERD di PRD §6
│   └── seed.ts            # data contoh (samakan dengan frontend/src/mock/data.ts)
└── src/
    ├── index.ts           # bootstrap: http server + socket.io + listen
    ├── app.ts             # express app, middleware, mount /api
    ├── lib/               # prisma client, jwt, password, kalkulasi order, socket
    ├── middleware/         # auth (JWT + role guard), error handler
    ├── services/           # logika inti: create order, ubah status, catat pembayaran
    └── routes/             # 1 file per resource (REST endpoints)
```

## 5. Daftar Endpoint

### Publik (tanpa login — Self-Order pelanggan)

| Method | Path                                     | Keterangan                          |
| ------ | ----------------------------------------- | ------------------------------------ |
| GET    | `/api/public/tables/:qrToken`             | Resolve meja dari QR                 |
| GET    | `/api/public/businesses/:id/catalog`      | Katalog kategori+produk+opsi tersedia|
| POST   | `/api/public/orders`                      | Checkout pesanan pelanggan           |
| GET    | `/api/public/orders/:clientOrderId`       | Cek status order (polling fallback)  |

### Auth

| Method | Path              | Keterangan            |
| ------ | ----------------- | ---------------------- |
| POST   | `/api/auth/login` | Login, dapat JWT       |
| GET    | `/api/auth/me`    | Profil user yang login |

### Business (owner untuk update)

| Method | Path            | Role  | Keterangan                                   |
| ------ | --------------- | ----- | --------------------------------------------- |
| GET    | `/api/business` | staff | Profil bisnis                                 |
| PUT    | `/api/business` | owner | Update identitas, pajak, service charge, dll  |

### Staff (owner only)

| Method | Path             | Keterangan                    |
| ------ | ---------------- | ------------------------------ |
| GET    | `/api/staff`     | List staff                     |
| POST   | `/api/staff`     | Tambah staff                   |
| PUT    | `/api/staff/:id` | Edit staff / ganti password    |
| DELETE | `/api/staff/:id` | Nonaktifkan staff (soft delete)|

### Tables (meja)

| Method | Path                             | Role  | Keterangan            |
| ------ | -------------------------------- | ----- | ---------------------- |
| GET    | `/api/tables`                    | staff | List meja               |
| POST   | `/api/tables`                    | owner | Tambah meja (auto QR token) |
| PUT    | `/api/tables/:id`                | owner | Edit meja               |
| POST   | `/api/tables/:id/regenerate-qr`  | owner | Ganti QR token           |
| DELETE | `/api/tables/:id`                | owner | Hapus meja               |

### Categories & Products

| Method | Path                                             | Role         | Keterangan                    |
| ------ | ------------------------------------------------- | ------------ | ------------------------------ |
| GET    | `/api/categories`                                  | staff        | List kategori                  |
| POST/PUT/DELETE | `/api/categories(/:id)`                   | owner        | CRUD kategori                  |
| GET    | `/api/products`                                    | staff        | List produk + opsi              |
| POST/PUT/DELETE | `/api/products(/:id)`                     | owner        | CRUD produk                     |
| PATCH  | `/api/products/:id/availability`                   | staff        | Toggle Out of Stock cepat        |
| POST/PUT/DELETE | `/api/products/:id/options(/:optionId)`   | owner        | CRUD varian/add-ons              |

### Orders

| Method | Path                     | Role  | Keterangan                              |
| ------ | ------------------------ | ----- | ----------------------------------------- |
| GET    | `/api/orders`            | staff | Feed order (filter status/source/payment) |
| GET    | `/api/orders/:id`        | staff | Detail order                              |
| POST   | `/api/orders`            | staff | Input pesanan manual (Frontoffice)        |
| PATCH  | `/api/orders/:id/status` | staff | Ubah status (diterima→diproses→siap→selesai) |
| PATCH  | `/api/orders/:id/pay`    | staff | Catat/verifikasi pembayaran lunas         |

### Ingredients & Stock Movements

| Method | Path                          | Keterangan                                  |
| ------ | ----------------------------- | --------------------------------------------|
| GET    | `/api/ingredients`            | List bahan                                   |
| POST   | `/api/ingredients`            | Tambah bahan                                 |
| PUT    | `/api/ingredients/:id`        | Edit info bahan                              |
| DELETE | `/api/ingredients/:id`        | Nonaktifkan bahan                            |
| GET    | `/api/ingredients/:id/movements` | Riwayat pergerakan stok                   |
| POST   | `/api/ingredients/:id/movements` | Catat stok in/out/adjustment/waste        |

### Analytics (BackOffice)

| Method | Path                                        | Keterangan                                  |
| ------ | -------------------------------------------- | --------------------------------------------|
| GET    | `/api/analytics/dashboard?period=daily\|weekly\|monthly` | Omset, total order, avg, top 5 produk |
| GET    | `/api/analytics/sales?period=daily\|weekly\|monthly`     | Deret omset per waktu + Self Order vs POS |

Semua endpoint yang butuh login memakai header `Authorization: Bearer <token>`.

## 6. Aturan bisnis penting yang sudah diimplementasikan

- **Kalkulasi total** persis mengikuti rumus di `frontend/src/mock/store.tsx`: `service = subtotal * (serviceChargeRate/100)`, `tax = (subtotal+service) * (taxRate/100)`, `total = subtotal+service+(taxBearer==='cafe' ? 0 : tax)`.
- **Idempotency**: `clientOrderId` unik — kalau dikirim ulang (retry offline sync), order lama dikembalikan, tidak dibuat dobel.
- **Nomor order unik** dengan retry otomatis kalau terjadi race condition antar request paralel.
- **Snapshot harga**: `order_items.price` & `product_name` disimpan saat transaksi dibuat, tidak berubah walau harga produk diedit belakangan.
- **Stock movement wajib**: `current_stock` bahan **hanya** bisa berubah lewat endpoint `POST /ingredients/:id/movements`, setiap perubahan otomatis tercatat sebagai riwayat.
- **business_id di semua tabel operasional** — fondasi SaaS-ready sesuai PRD, walau saat ini baru dipakai untuk 1 bisnis.
- **Realtime** order baru & perubahan status langsung di-broadcast lewat Socket.io per-room bisnis.

## 7. Menuju production nanti

1. Sewa Postgres managed (Neon/Railway/RDS/Supabase/dll) atau tetap Docker di VPS.
2. Ganti `DATABASE_URL` di `.env` production.
3. `npx prisma migrate deploy` (bukan `migrate dev`) untuk menerapkan migrasi tanpa prompt interaktif.
4. Ganti `JWT_SECRET` dengan string acak panjang yang benar-benar rahasia.
5. Set `CORS_ORIGIN` ke domain frontend production.
6. (Opsional, sesuai roadmap PRD §9) integrasikan payment gateway (Midtrans/Xendit) untuk verifikasi QRIS otomatis — struktur tabel `payments.gateway`/`payments.reference` sudah disiapkan untuk ini.

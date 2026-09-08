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

## 3. Alur testing tanpa frontend (curl / Postman)

> Semua contoh memakai base `http://localhost:4000`. Endpoint yang butuh login memakai
> header `Authorization: Bearer <token>`. Dapatkan token sekali via login, lalu pakai untuk
> semua request staff:
>
> ```bash
> curl -s -X POST http://localhost:4000/api/auth/login \
>   -H "Content-Type: application/json" \
>   -d '{"email":"owner@beanbrew.id","password":"Owner123!"}'
> # -> simpan "token" dari response
>
> TOKEN="<paste token di sini>"
> ```

### 3.1. Health & Auth — bisa diuji

```bash
# Health check (tanpa login)
curl -s http://localhost:4000/health

# Login (dapat JWT + info role/businessId)
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@beanbrew.id","password":"Owner123!"}'

# Profil user yang login
curl -s http://localhost:4000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

### 3.2. Self-Order pelanggan (tanpa login) — bisa diuji

```bash
# 1. Scan QR -> resolve meja + info bisnis (pajak/service + enabledPaymentMethods + paymentSettings)
curl -s http://localhost:4000/api/public/tables/table-01

# 2. Lihat katalog (pakai businessId dari response di atas)
curl -s http://localhost:4000/api/public/businesses/1/catalog

# 3. Checkout tunai (langsung pending manual)
curl -s -X POST http://localhost:4000/api/public/orders \
  -H "Content-Type: application/json" \
  -d '{
    "qrToken": "table-01",
    "customerName": "Budi",
    "paymentMethod": "cash",
    "items": [{ "productId": 1, "quantity": 1, "selectedOptionIds": [2, 4] }]
  }'

# 4. Checkout QRIS / E-Wallet / VA (trigger Midtrans charge otomatis bila
#    paymentSettings.<method>.gateway = "midtrans"; item_details produk+service+tax ikut terkirim)
curl -s -X POST http://localhost:4000/api/public/orders \
  -H "Content-Type: application/json" \
  -d '{
    "qrToken": "table-01",
    "customerName": "Sinta",
    "paymentMethod": "qris",
    "items": [{ "productId": 1, "quantity": 1 }]
  }'
# -> payments[0].gateway = "midtrans", gatewayData.qrUrl = URL QR PNG Midtrans

# 5. Polling status order (fallback selain socket)
curl -s http://localhost:4000/api/public/orders/<clientOrderId-dari-response-checkout>

# 6. Polling status Midtrans + auto-sync paid (fallback webhook, tanpa perlu ngrok)
curl -s http://localhost:4000/api/public/orders/by-number/BE-9028/status
# -> { order: {...paymentStatus...}, midtrans: { transaction_status } }
#    Jika Midtrans sudah settlement tapi lokal masih pending, endpoint ini otomatis menandai paid.
```

### 3.3. Webhook Midtrans (butuh URL publik, mis. ngrok) — bisa diuji

```bash
# Set di .env: MIDTRANS_NOTIFICATION_URL=https://<xxx>.ngrok-free.app/api/public/midtrans/notification
# Midtrans akan POST ke sini saat status berubah (pending/settlement/expire).
# Verifikasi signature SHA512(order_id+status_code+gross_amount+ServerKey) otomatis;
# settlement -> order paid + emit socket order:payment_updated.
curl -s http://localhost:4000/api/public/orders/by-number/BE-9028/status
```

### 3.4. Orders staff (Frontoffice) — bisa diuji

```bash
# Feed order (filter opsional: ?status=diterima&source=self_order&paymentStatus=pending&limit=50)
curl -s "http://localhost:4000/api/orders?status=diterima" -H "Authorization: Bearer $TOKEN"

# Detail order
curl -s http://localhost:4000/api/orders/1 -H "Authorization: Bearer $TOKEN"

# Input pesanan manual kasir (source pos, paymentMethod: cash|qris|ewallet|bank_transfer)
curl -s -X POST http://localhost:4000/api/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"customerName":"Walk-in","paymentMethod":"cash","items":[{"productId":1,"quantity":2}]}'

# Ubah status (diterima -> diproses -> siap -> selesai)
curl -s -X PATCH http://localhost:4000/api/orders/1/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"diproses"}'

# Catat/verifikasi pembayaran lunas (manual, mis. cash)
curl -s -X PATCH http://localhost:4000/api/orders/1/pay \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"method":"cash"}'
```

### 3.5. Business / Staff / Tables / Categories / Products — bisa diuji

```bash
# Profil bisnis (semua role boleh baca; ServerKey Midtrans tidak pernah di-expose)
curl -s http://localhost:4000/api/business -H "Authorization: Bearer $TOKEN"

# Update bisnis (owner only): identitas, pajak, service charge, metode pembayaran,
# paymentSettings per metode (gateway manual|midtrans), midtransMode global|custom
curl -s -X PUT http://localhost:4000/api/business \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"taxEnabled":true,"taxLabel":"PB1","taxRate":10,"enabledPaymentMethods":["cash","qris","bank_transfer"]}'

# Staff (owner only)
curl -s http://localhost:4000/api/staff -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:4000/api/staff \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Dedi Kasir","email":"dedi@beanbrew.id","password":"Dedi123!","role":"kasir"}'

# Meja (list: staff; tambah/edit/regenerate-qr/hapus: owner only)
curl -s http://localhost:4000/api/tables -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:4000/api/tables \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"tableNumber":"07","area":"Indoor"}'

# Kategori (list: staff; tulis: owner only)
curl -s http://localhost:4000/api/categories -H "Authorization: Bearer $TOKEN"

# Produk (list: staff; CRUD + opsi: owner only; toggle availability: semua staff)
curl -s http://localhost:4000/api/products -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:4000/api/products/1/availability \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"isAvailable":false}'
```

### 3.6. Ingredients & Analytics — bisa diuji

```bash
# Bahan
curl -s http://localhost:4000/api/ingredients -H "Authorization: Bearer $TOKEN"

# Catat pergerakan stok (satu-satunya cara mengubah current_stock)
curl -s -X POST http://localhost:4000/api/ingredients/1/movements \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"in","quantity":5,"notes":"Restock"}'
curl -s http://localhost:4000/api/ingredients/1/movements -H "Authorization: Bearer $TOKEN"

# Analytics (period = daily|weekly|monthly)
curl -s "http://localhost:4000/api/analytics/dashboard?period=daily" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:4000/api/analytics/sales?period=weekly" -H "Authorization: Bearer $TOKEN"
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

## 5. Daftar Endpoint (semua bisa diuji via §3)

### Publik (tanpa login — Self-Order pelanggan + webhook Midtrans)

| Method | Path                                            | Keterangan                                                        |
| ------ | ----------------------------------------------- | ------------------------------------------------------------------ |
| GET    | `/api/public/tables/:qrToken`                   | Resolve meja + info bisnis (pajak/service/metode pembayaran)       |
| GET    | `/api/public/businesses/:id/catalog`            | Katalog kategori+produk+opsi tersedia                              |
| POST   | `/api/public/orders`                            | Checkout (cash manual / qris-ewallet-VA via Midtrans bila aktif)   |
| GET    | `/api/public/orders/:clientOrderId`             | Cek status order (polling fallback)                                |
| GET    | `/api/public/orders/by-number/:orderNumber/status` | Polling status Midtrans + auto-sync paid + fallbackQrUrl QRIS   |
| POST   | `/api/public/midtrans/notification`             | Webhook Midtrans (verify signature, settlement→paid otomatis)       |

### Auth

| Method | Path              | Keterangan            |
| ------ | ----------------- | ---------------------- |
| POST   | `/api/auth/login` | Login, dapat JWT       |
| GET    | `/api/auth/me`    | Profil user yang login |

### Business (owner untuk update)

| Method | Path            | Role  | Keterangan                                                              |
| ------ | --------------- | ----- | ------------------------------------------------------------------------ |
| GET    | `/api/business` | staff | Profil bisnis (tanpa ServerKey Midtrans, ada flag hasMidtransCustomKey)  |
| PUT    | `/api/business` | owner | Identitas, pajak, service charge, enabledPaymentMethods, paymentSettings (gateway manual\|midtrans, bank/channel), midtransMode global\|custom + ServerKey terenkripsi |

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

## 7. Midtrans (sudah terintegrasi, bukan roadmap)

- QRIS tanpa `qris.acquirer` (ikut default GoPay Midtrans, object `qris` Optional sesuai docs).
- `POST /api/public/orders` & `POST /api/orders` otomatis charge Midtrans bila
  `paymentSettings.<method>.gateway = "midtrans"` (qris/ewallet gopay-shopeepay/VA bca-bni-bri-mandiri-permata-cimb);
  `item_details` produk + Service Charge + Tax ikut terkirim (sum == total, kalau tidak cocok di-omit agar charge tetap sukses).
- `payments.gateway = "midtrans"`, `reference = transaction_id`,
  `gatewayData = { qrUrl, qrString, vaNumber, redirectUrl, raw, lastNotification }`
  (merge — webhook `pending` tidak menghapus `qrUrl` charge).
- Webhook `POST /api/public/midtrans/notification` verifikasi `SHA512(order_id+status_code+gross_amount+ServerKey)`;
  butuh URL publik — lokal pakai ngrok: `MIDTRANS_NOTIFICATION_URL=https://<xxx>.ngrok-free.app/api/public/midtrans/notification`.
- Tanpa ngrok, pakai `GET /api/public/orders/by-number/:orderNumber/status` untuk poll + auto-sync `paid`.
- Isi `.env`: `MIDTRANS_SERVER_KEY=SB-Mid-server-...`, `MIDTRANS_IS_PRODUCTION=false` untuk Sandbox.

## 8. Menuju production nanti

1. Sewa Postgres managed (Neon/Railway/RDS/Supabase/dll) atau tetap Docker di VPS.
2. Ganti `DATABASE_URL` di `.env` production.
3. `npx prisma migrate deploy` (bukan `migrate dev`) untuk menerapkan migrasi tanpa prompt interaktif.
4. Ganti `JWT_SECRET` dengan string acak panjang yang benar-benar rahasia.
5. Set `CORS_ORIGIN` ke domain frontend production.
6. Ganti `MIDTRANS_IS_PRODUCTION=true` + ServerKey production + `MIDTRANS_NOTIFICATION_URL` domain publik.

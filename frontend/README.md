# Servopay Frontend

Web App Coffee Shop Management — tiga area: **Self-Order pelanggan (mobile)**,
**Frontoffice kasir/barista (desktop)**, **BackOffice owner (desktop)**.

> Project ini masih **mock in-memory** (`CafeProvider` di `src/mock/store.tsx`) dan
> **belum tersambung ke `../backend`**. Backend REST API sudah siap dan bisa dites
> via curl/Postman (lihat `../backend/README.md` §3) — integrasi FE→BE adalah tahap berikutnya.

## Akun demo (mock, auto-detect role tanpa dropdown)

| Role    | Email               | Password  | Redirect setelah login              |
| ------- | ------------------- | --------- | ----------------------------------- |
| Owner   | owner@beanbrew.id   | Owner123! | `/backoffice/dashboard`             |
| Kasir   | kasir@beanbrew.id   | Kasir123! | `/frontoffice/orders`               |
| Barista | barista@beanbrew.id | Barista123! | `/frontoffice/orders`             |

QR token meja contoh: `table-01` s/d `table-05` aktif, `table-06` nonaktif.
Akses Self-Order: `http://localhost:5173/servopay/order/table-01`
(password mock polos; backend memakai bcrypt — samakan kredensialnya).

## Stack

- **React 19 + TypeScript + Vite**
- **React Router** (`basename=/servopay/`, alias legacy `/pos/*` → `/frontoffice`, `/owner/*` → `/backoffice`)
- **Tailwind CSS 4** + font `Fraunces`/`Inter` + `material-symbols`
- State sementara: **React Context** (`CafeProvider`), belum IndexedDB/Service Worker

## Setup

```bash
cd frontend
npm install

# Jalankan dev server
npm run dev

# Cek type + build production (wajib lolos sebelum commit)
npm run build
```

- Dev server: `http://localhost:5173`
- Self-Order: `http://localhost:5173/servopay/order/table-01`
- Login: `http://localhost:5173/servopay/login`

## Rute & guard role

| Path                          | Role                    | Keterangan                              |
| ----------------------------- | ----------------------- | ---------------------------------------- |
| `/`                           | publik                  | Redirect role-based (login/dashboard)    |
| `/login`                      | publik                  | Email+password, tanpa dropdown role      |
| `/order/:token`               | publik (pelanggan)      | Self-Order: Menu → Cart → Payment → Status |
| `/frontoffice/orders`         | kasir, barista, owner   | Real-time order feed + ubah status       |
| `/frontoffice/manual`         | kasir, barista, owner   | Input pesanan manual (Ticket)            |
| `/frontoffice/catalog`        | kasir, barista, owner   | Toggle Out of Stock cepat                |
| `/frontoffice/inventory`      | kasir, barista, owner   | Bahan + stock movement                   |
| `/frontoffice/settings`       | kasir, barista, owner   | Perangkat, Modal Kas, Akun & Sesi        |
| `/backoffice/dashboard`       | owner                   | Omset, Top 5, chart per periode          |
| `/backoffice/sales/omset`     | owner                   | Omset + Self Order vs Manual             |
| `/backoffice/sales/performa`  | owner                   | Performa Item (menu/kategori/varian)     |
| `/backoffice/sales/riwayat`   | owner                   | Riwayat transaksi                        |
| `/backoffice/menu/catalog`    | owner                   | CRUD menu + HPP opsional + varian        |
| `/backoffice/menu/categories` | owner                   | CRUD kategori                            |
| `/backoffice/menu/variants`   | owner                   | Kelola varian & add-ons                  |
| `/backoffice/tables`          | owner                   | Meja + QR preview/print + Edit Struk global |
| `/backoffice/staff`           | owner                   | CRUD staff (kasir/barista; owner disembunyikan) |
| `/backoffice/settings/profile`  | owner                 | Profil akun + ubah password              |
| `/backoffice/settings/business` | owner                 | Identitas bisnis + logo (2MB, in-memory) |
| `/backoffice/settings/tax`      | owner                 | Pajak PB1/PBJT/PPN + bearer + service    |
| `/backoffice/settings/payment`  | owner                 | Metode aktif + gateway Manual/Midtrans + Midtrans global/custom |

## Aturan bisnis di frontend (mirror backend)

- Total: `service = subtotal*rate`, `taxBase = subtotal+service`, `tax = taxBase*rate`,
  `total = subtotal+service + (taxBearer==='cafe' ? 0 : tax)` — sama dengan `backend/src/lib/order-calc.ts`.
- Katalog tampil harga penuh `Rp 30.000` (`formatRupiah`), bukan `Rp 30k`.
- Metode pembayaran Self-Order difilter dari `business.enabledPaymentMethods`
  (label polos + sub: Tunai→Bayar di Kasir, QRIS→Dana/ShopeePay/GoPay, E-Wallet→GoPay/ShopeePay, VA→BNI/BRI/BCA).
- `PaymentMethod` valid: `cash|qris|ewallet|bank_transfer` (sinkron dengan backend).
- Offline disimulasikan: flag `connection online|offline|syncing` + `pendingSyncCount` + `syncNow()` 800ms;
  IndexedDB/Service Worker asli belum ada (tahap backend).
- Logo bisnis masih in-memory (reset saat refresh, belum persist backend).

## Struktur Folder

```
frontend/
├── public/                         # aset statis (favicon)
├── index.html
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx                    # entry React
    ├── App.tsx                     # router + RequireAuth per role + legacy redirect
    ├── index.css                   # Tailwind + token warna/font
    ├── mock/                       # data & state sementara (belum API)
    │   ├── data.ts                 # seed bisnis, staff, menu, meja, order, bahan
    │   └── store.tsx               # CafeProvider + useCafe()
    ├── shared/                     # dipakai ketiga area
    │   ├── types/index.ts          # tipe domain (order, product, business, payment)
    │   ├── lib/format.ts           # formatRupiah, uid, formatTime
    │   └── components/
    │       ├── ui.tsx              # Button, Field, TextInput, Badge
    │       └── icons.tsx
    └── features/                   # modul per area aplikasi
        ├── auth/
        │   ├── LoginPage.tsx
        │   └── RequireAuth.tsx
        ├── self-order/             # pelanggan (mobile)
        │   ├── SelfOrderApp.tsx
        │   ├── screens/            # MenuScreen, CartScreen, PaymentScreen, StatusScreen
        │   └── components/         # ItemSheet, BottomNav
        ├── pos/                    # kasir / barista (desktop)
        │   ├── PosLayout.tsx
        │   ├── components/         # PosHeader, ReceiptModal
        │   └── pages/
        │       ├── OrdersPage.tsx
        │       ├── CatalogPage.tsx
        │       ├── InventoryPage.tsx
        │       ├── ManualOrderPage.tsx
        │       └── PosSettingsPage.tsx
        └── owner/                  # analytics & manajemen
            ├── OwnerLayout.tsx     # OwnerLayout + OwnerSettingsPage (<Outlet/>)
            ├── components/
            │   └── OwnerSidebar.tsx    # Dashboard, Sales, Menu, Tables, Staff, Settings
            └── pages/
                ├── DashboardPage.tsx
                ├── StaffPage.tsx
                ├── TablesPage.tsx
                ├── menu/
                │   ├── MenuCatalogPage.tsx
                │   ├── MenuCategoriesPage.tsx
                │   └── MenuVariantsPage.tsx
                ├── sales/
                │   ├── SalesHistoryPage.tsx
                │   ├── SalesOmsetPage.tsx
                │   └── SalesPerformancePage.tsx
                └── settings/
                    ├── CafeSettingsPage.tsx
                    ├── ProfileSettingsPage.tsx
                    ├── TaxSettingsPage.tsx
                    └── PaymentSettingsPage.tsx
```

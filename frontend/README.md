# Servopay Frontend

Project ini **berdiri sendiri** — belum disambungkan ke `../backend`. Core feature **Halaman Pemesanan Pelanggan (Self-Ordering)**, **Halaman Frontoffice (POS), dan **Halaman BackOffice (Owner)**.

## Stack

- **React + TypeScript,**
- **vite**
- **Tailwind**


## Setup

```bash
cd frontend
npm install

# jalankan build (Optional)
npm run build

# Jalankan server 
npm run dev
```

Server jalan di `http://localhost:5173` dan akses `http://localhost:5173/servopay/order/table-01` untuk mengakses Self-Order

## Struktur Folder

```
frontend/
├── public/                         # aset statis (favicon)
├── index.html
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx                    # entry React
    ├── App.tsx                     # router: landing, login, self-order, POS, owner
    ├── index.css                   # Tailwind + token warna/font
    ├── mock/                       # data & state sementara (belum API)
    │   ├── data.ts                 # seed menu, meja, order, bahan, staff
    │   └── store.tsx               # CafeProvider + useCafe()
    ├── shared/                     # dipakai ketiga area
    │   ├── types/index.ts          # tipe domain (order, product, dll)
    │   ├── lib/format.ts           # format Rupiah, id, waktu
    │   └── components/
    │       ├── ui.tsx              # Button, Field, TextInput, Badge
    │       └── icons.tsx
    └── features/                   # modul per area aplikasi
        ├── landing/LandingPage.tsx
        ├── auth/
        │   ├── LoginPage.tsx
        │   └── RequireAuth.tsx
        ├── self-order/             # pelanggan (mobile)
        │   ├── SelfOrderApp.tsx
        │   ├── screens/            # Menu, Cart, Payment, Status
        │   └── components/         # ItemSheet, BottomNav
        ├── pos/                    # kasir / barista (desktop)
        │   ├── PosLayout.tsx       # 
        │   ├── components/         # Header Navbar/ receipept Modal
        │   └── pages/
        │       ├── OrdersPage.tsx
        │       ├── CatalogPage.tsx
        │       ├── InventoryPage.tsx
        │       ├── ManualOrderPage.tsx
        │       └── PosSettingsPage.tsx
        └── owner/                  # analytics & manajemen
            ├── OwnerLayout.tsx      
            ├── components/          
            │   └── OwnerSidebar.tsx    # Sidebar nav: Dashboard, Sales, Menu, Tables, Staff, Settings
            └── pages/
                ├── DashboardPage.tsx
                ├── StaffPage.tsx
                ├── TablesPage.tsx
                ├── menu/
                │   ├── MenuCatalogPage.tsx
                │   ├── MenuCatategoriesPage.tsx
                │   └── MenuVariantsPage.tsx
                ├── sales/
                │   ├── SalesHistoryPage.tsx
                │   ├── SalesOmsetPage.tsx
                │   └── SalesPerformancePage.tsx
                └── settings/
                    ├── CafeSettingsPage.tsx
                    ├── ProfileSettingPage.tsx
                    └── TaxSettingsPage.tsx
```
export type UserRole = 'owner' | 'kasir' | 'barista'

export type OrderStatus = 'diterima' | 'diproses' | 'siap' | 'selesai'
export type PaymentMethod = 'cash' | 'qris' | 'ewallet' | 'bank_transfer'
export type PaymentStatus = 'pending' | 'paid' | 'failed'

export interface PaymentSettings {
  instruction?: string
  qrImageUrl?: string
  bankName?: string
  accountNumber?: string
  accountName?: string
  wallets?: string[]
  gateway?: 'manual' | 'midtrans'
  // Deprecated: tidak dikirim ke Midtrans lagi, diabaikan backend.
  acquirer?: string
  bank?: 'bca' | 'bni' | 'bri' | 'mandiri' | 'permata' | 'cimb'
  channel?: 'gopay' | 'shopeepay'
}
export type OrderSource = 'self_order' | 'pos'
export type ConnectionStatus = 'online' | 'offline' | 'syncing'
export type StockMovementType = 'in' | 'out' | 'adjustment' | 'waste'
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export type TaxLabel = 'PB1' | 'PBJT' | 'PPN'
export type TaxBearer = 'customer' | 'cafe'

export interface Business {
  id: string
  name: string
  tagline: string
  address: string
  phone: string
  email: string
  logoUrl?: string
  taxEnabled: boolean
  taxLabel: TaxLabel
  taxRate: number
  taxBearer: TaxBearer
  serviceChargeEnabled: boolean
  serviceChargeRate: number
  soundEnabled: boolean
  openingCash: number
  qrTemplate?: QrConfig
  enabledPaymentMethods: PaymentMethod[]
  paymentSettings: Record<string, PaymentSettings>
  midtransMode: 'global' | 'custom'
  hasMidtransCustomKey: boolean
  midtransQrisAcquirer?: string | null
}

export interface StaffUser {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  password: string
}

export interface QrConfig {
  title?: string
  subtitle?: string
  instruction?: string
  extraText?: string
  showLogo: boolean
  showTableNumber: boolean
  accentColor?: string
}

export interface CafeTable {
  id: string
  tableNumber: string
  qrToken: string
  isActive: boolean
  area?: string
  qrConfig?: QrConfig
}

export interface Category {
  id: string
  name: string
  sortOrder: number
}

export interface ProductOption {
  id: string
  name: string
  type: string
  price: number
  isRequired: boolean
}

export interface Product {
  id: string
  categoryId: string
  name: string
  description: string
  price: number
  hpp?: number
  imageUrl: string
  isAvailable: boolean
  badge?: string
  options: ProductOption[]
}

export interface CartItem {
  cartId: string
  productId: string
  name: string
  price: number
  quantity: number
  optionsLabel: string
  options: Record<string, string | number | boolean>
  imageUrl: string
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  price: number
  quantity: number
  options: Record<string, string | number | boolean>
  optionsLabel: string
  subtotal: number
}

export interface Order {
  id: string
  orderNumber: string
  clientOrderId: string
  tableId: string | null
  tableNumber: string | null
  customerName: string
  source: OrderSource
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  subtotal: number
  serviceCharge: number
  tax: number
  taxLabel: TaxLabel
  taxBearer: TaxBearer
  total: number
  createdAt: string
  items: OrderItem[]
  syncStatus: SyncStatus
}

export interface Ingredient {
  id: string
  name: string
  unit: string
  currentStock: number
  minimumStock: number
  isAvailable: boolean
}

export interface StockMovement {
  id: string
  ingredientId: string
  type: StockMovementType
  quantity: number
  stockBefore: number
  stockAfter: number
  notes: string
  createdAt: string
}

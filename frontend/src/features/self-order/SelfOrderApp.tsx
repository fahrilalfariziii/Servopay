import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCafe } from '../../mock/store'
import type { CartItem, PaymentMethod, Product } from '../../shared/types'
import { CartScreen } from './screens/CartScreen'
import { MenuScreen } from './screens/MenuScreen'
import { PaymentScreen } from './screens/PaymentScreen'
import { StatusScreen } from './screens/StatusScreen'
import { ItemSheet } from './components/ItemSheet'
import { BottomNav } from './components/BottomNav'

type Screen = 'menu' | 'cart' | 'payment' | 'status'

export function SelfOrderApp() {
  const { token } = useParams()
  const { tables, products, placeOrder, orders, business } = useCafe()
  // Fallback ke meja 04 hanya jika token tidak ada (mis. akses langsung /order tanpa token).
  // Jika token ada tapi tidak valid/inaktif -> tampilkan error "Meja tidak ditemukan".
  const fallbackTable = tables.find((t) => t.tableNumber === '04')
  const tableByToken = token ? tables.find((t) => t.qrToken === token && t.isActive) : undefined
  const table = token ? (tableByToken ?? null) : (fallbackTable ?? null)
  const [screen, setScreen] = useState<Screen>('menu')
  const [cart, setCart] = useState<CartItem[]>([])
  const [popup, setPopup] = useState<Product | null>(null)
  const [customerName, setCustomerName] = useState('')
  const enabledMethods = (business.enabledPaymentMethods as PaymentMethod[]) ?? ['cash', 'qris']
  const [payMethod, setPayMethod] = useState<PaymentMethod>(enabledMethods[0] ?? 'cash')
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (!enabledMethods.includes(payMethod) && enabledMethods.length > 0) {
      setPayMethod(enabledMethods[0])
    }
  }, [enabledMethods.join(','), payMethod])

  const activeOrder = orders.find((o) => o.id === activeOrderId) ?? null

  function addToCart(item: Product, optionsLabel: string, options: CartItem['options'], unitPrice: number, qty: number) {
    setCart((prev) => [
      ...prev,
      {
        cartId: `${item.id}-${Date.now()}`,
        productId: item.id,
        name: item.name,
        price: unitPrice,
        quantity: qty,
        optionsLabel,
        options,
        imageUrl: item.imageUrl,
      },
    ])
    setPopup(null)
  }

  function updateQty(cartId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.cartId === cartId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    )
  }

  function checkout() {
    const order = placeOrder({
      items: cart,
      customerName,
      tableId: table?.id ?? null,
      tableNumber: table?.tableNumber ?? null,
      paymentMethod: payMethod,
      source: 'self_order',
    })
    
    setActiveOrderId(order.id)
    setCart([]) // Kosongkan keranjang setelah checkout berhasil

    if (payMethod !== 'cash') setScreen('payment')
    else setScreen('status')
  }

  // Helper navigasi untuk tab Pesanan di seluruh layar
  const handleGoOrderTab = () => {
    if (activeOrder) {
      setScreen('status')
    } else {
      setScreen('cart')
    }
  }

  if (!table) {
    return (
      <div className="flex min-h-full items-center justify-center bg-paper px-6 text-center">
        <p className="text-soil">Meja tidak ditemukan atau sudah tidak aktif.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-paper sm:bg-[#d0ccc8] sm:py-6">
      <div className="relative flex h-full min-h-screen w-full max-w-md flex-col overflow-hidden bg-paper shadow-2xl sm:min-h-[844px] sm:rounded-[24px]">
        <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
          {screen === 'menu' && (
            <MenuScreen
              tableNumber={table.tableNumber}
              products={products}
              cart={cart}
              onSelectItem={setPopup}
              onUpdateQty={updateQty}
              onGoCart={() => setScreen('cart')}
              onGoOrder={handleGoOrderTab}
            />
          )}
          {screen === 'cart' && (
            <CartScreen
              tableNumber={table.tableNumber}
              cart={cart}
              customerName={customerName}
              payMethod={payMethod}
              onName={setCustomerName}
              onPayMethod={setPayMethod}
              onBack={() => setScreen('menu')}
              onUpdateQty={updateQty}
              onCheckout={checkout}
            />
          )}
          {screen === 'payment' && activeOrder && (
            <PaymentScreen
              order={activeOrder}
              onBack={() => setScreen('menu')}
              onConfirm={() => setScreen('status')}
            />
          )}
          {screen === 'status' && (
            <StatusScreen
              order={activeOrder}
              cart={cart}
              tableNumber={table.tableNumber}
              onOrderAgain={() => {
                setScreen('menu')
              }}
            />
          )}
        </main>
        <BottomNav
              currentScreen={screen}
              hasActiveOrder={Boolean(activeOrder)}
              onNavigate={(targetScreen) => setScreen(targetScreen)}
              />
        {popup && (
          <ItemSheet item={popup} onClose={() => setPopup(null)} onAdd={addToCart} />
        )}
      </div>
    </div>
  )
}
import { IMG } from "../../../mock/data";
import { useCafe } from "../../../mock/store";
import type { CartItem, Product } from "../../../shared/types";
import { normalizeTheme } from "../../../shared/types";
import { formatRupiah } from "../../../shared/lib/format";
import {
  IconCart,
  IconPlus,
  IconSearch,
} from "../../../shared/components/icons";
import { useState } from "react";

interface Props {
  tableNumber: string;
  products: Product[];
  cart: CartItem[];
  onSelectItem: (item: Product) => void;
  onUpdateQty: (cartId: string, delta: number) => void;
  onGoCart: () => void;
  onGoOrder: () => void;
}

export function MenuScreen({
  tableNumber,
  products,
  cart,
  onSelectItem,
  onGoCart,
  // onGoOrder,
}: Props) {
  const { business, categories } = useCafe();
  const theme = normalizeTheme(business.theme);
  const headerBg = theme.headerImage || IMG.headerBg;
  const titleFont = theme.titleFont === 'sans' ? 'font-sans' : theme.titleFont === 'serif' ? 'font-serif' : 'font-display';
  const pillRadius = theme.radius === 'full' ? 'rounded-full' : 'rounded-[12px]';
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const cats = ["Semua", ...categories.map((c) => c.name)];
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const filtered = products.filter((m) => {
    const catName = categories.find((c) => c.id === m.categoryId)?.name;
    const matchCat = category === "Semua" || catName === category;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function qtyFor(id: string) {
    return cart
      .filter((c) => c.productId === id)
      .reduce((s, c) => s + c.quantity, 0);
  }

  return (
    <div className="flex h-full flex-col" style={{ background: theme.pageBg }}>
      <div className="relative shrink-0">
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          src={headerBg}
        />
        <div className="absolute inset-0 bg-black" style={{ opacity: theme.headerOverlay / 100 }} />
        <div className="relative flex flex-col items-center gap-3 px-5 py-6">
          {business.logoUrl ? (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="size-16 rounded-full border border-white/30 object-cover"
              style={{ background: theme.primary }}
            />
          ) : (
            <div
              className="flex size-16 items-center justify-center rounded-full font-display text-xl text-white"
              style={{ background: theme.primary }}
            >
              {(business.name || 'B').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <p className={`text-2xl font-bold text-white ${titleFont}`}>
              {business.name}
            </p>
            <p className="text-sm font-medium text-white">
              {theme.welcomeText}
            </p>
            {theme.showTagline && <p className="text-xs italic text-white/80">{business.tagline}</p>}
          </div>
          <div className={`border border-white/30 px-4 py-1 text-xs font-semibold text-white ${pillRadius}`} style={{ background: `${theme.accent}88` }}>
            Table {tableNumber}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="flex flex-col gap-6 px-5 pb-40 pt-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <IconSearch />
            </div>
            <input
              className="h-14 w-full rounded-full bg-[#eee] pl-12 pr-4 text-base text-soil shadow-inner outline-none"
              placeholder="Cari minuman atau makanan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {cats.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                style={category === cat ? { background: theme.primary, color: '#fff' } : undefined}
                className={`h-10 shrink-0 px-6 text-sm font-semibold ${pillRadius} ${
                  category === cat
                    ? ""
                    : "border border-clay/30 bg-[#eee] text-soil"
                }`}>{cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {filtered.map((item) => {
              const qty = qtyFor(item.id);
              return (
                <div
                  key={item.id}
                  style={qty > 0 ? { boxShadow: `0 0 0 2px ${theme.accent}` } : undefined}
                  className={`flex flex-col overflow-hidden rounded-[12px] bg-white shadow-[0_4px_15px_rgba(74,124,89,0.06)] ${
                    !item.isAvailable ? "opacity-60" : ""
                  }`}
                >
                  <div className="relative flex h-[150px] items-center justify-center bg-[#e2e2e2]">
                    {item.imageUrl ? (
                      <img
                        alt={item.name}
                        src={item.imageUrl}
                        className={`absolute inset-0 h-full w-full object-cover ${
                          !item.isAvailable ? "saturate-0" : ""
                        }`}
                      />
                    ) : (
                      <span className="font-display text-4xl text-stone">
                        {(item.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    {item.badge && (
                      <span
                        className="absolute right-2 top-2 rounded-[6px] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white"
                        style={{ background: theme.accent }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {!item.isAvailable && (
                      <div className="absolute inset-0 flex items-center justify-center bg-paper/40">
                        <span className="rounded-[6px] bg-[#ba1a1a]/90 px-2 py-1 text-xs text-white">
                          Habis
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-3">
                    <div>
                      <p className="text-sm font-semibold leading-snug text-ink">
                        {item.name}
                      </p>
                      <p className="mb-2 line-clamp-2 text-xs text-soil">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {formatRupiah(item.price)}
                      </span>
                      {item.isAvailable && (
                        <button
                          className="flex size-8 items-center justify-center rounded-full transition-transform active:scale-95"
                          style={{ background: theme.primary }}
                          onClick={() =>  onSelectItem(item)}
                          aria-label={`Tambah ${item.name} ke keranjang`}
                        >
                          <IconPlus />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-10 mx-auto w-full max-w-md px-5">
          <button
            onClick={onGoCart}
            style={{ background: theme.primary }}
            className="flex h-[72px] w-full items-center justify-between rounded-[12px] px-4 text-white shadow-xl transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex size-10 items-center justify-center rounded-full bg-white/20">
                <IconCart />
                <span
                  className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: theme.accent }}
                >
                  {cartCount}
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs text-white/80">{cartCount} Item</p>
                <p className="font-display text-xl font-semibold">
                  {formatRupiah(cartTotal)}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold">Lihat Keranjang →</span>
          </button>
        </div>
      )}
    </div>
  );
}

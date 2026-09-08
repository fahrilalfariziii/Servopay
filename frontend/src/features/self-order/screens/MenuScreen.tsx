import { IMG } from "../../../mock/data";
import { useCafe } from "../../../mock/store";
import type { CartItem, Product } from "../../../shared/types";
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
    <div className="flex h-full flex-col bg-paper">
      <div className="relative shrink-0">
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          src={IMG.headerBg}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative flex flex-col items-center gap-3 px-5 py-6">
          {business.logoUrl ? (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="size-16 rounded-full border border-white/30 bg-[#2f3e2a] object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-[#2f3e2a] font-display text-xl text-leaf">
              {(business.name || 'B').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-white">
              {business.name}
            </p>
            <p className="text-sm font-medium text-white">
              Halo, Selamat Datang!
            </p>
            <p className="text-xs italic text-white/80">{business.tagline}</p>
          </div>
          <div className="rounded-full border border-clay/30 bg-mint/50 px-4 py-1 text-xs font-semibold text-white">
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
                className={`h-10 shrink-0 rounded-full px-6 text-sm font-semibold ${
                  category === cat
                    ? "bg-mint text-[#526853]"
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
                  className={`flex flex-col overflow-hidden rounded-[12px] bg-white shadow-[0_4px_15px_rgba(74,124,89,0.06)] ${
                    !item.isAvailable ? "opacity-60" : ""
                  } ${qty > 0 ? "ring-2 ring-mint" : ""}`}
                >
                  <div className="relative h-[150px] bg-[#e2e2e2]">
                    <img
                      alt={item.name}
                      src={item.imageUrl}
                      className={`h-full w-full object-cover ${
                        !item.isAvailable ? "saturate-0" : ""
                      }`}
                    />
                    {item.badge && (
                      <span className="absolute right-2 top-2 rounded-[6px] bg-sage px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white">
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
                          className="flex size-8 items-center justify-center rounded-full bg-[#2f3e2a] transition-transform active:scale-95"
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
            className="flex h-[72px] w-full items-center justify-between rounded-[12px] bg-ink px-4 text-white shadow-xl transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex size-10 items-center justify-center rounded-full bg-white/20">
                <IconCart />
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-sage text-[10px] font-bold">
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

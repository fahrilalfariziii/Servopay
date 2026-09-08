import crypto from "crypto";
import { decrypt } from "../lib/encryption";

export type MidtransChargeResult = {
  transactionId: string;
  orderId: string;
  grossAmount: string;
  qrUrl?: string;
  qrString?: string;
  vaNumber?: string;
  vaBank?: string;
  redirectUrl?: string;
  raw: unknown;
};

function getMidtransConfigForBusiness(business: {
  midtransMode?: string | null;
  midtransServerKeyEnc?: string | null;
  midtransClientKey?: string | null;
  midtransQrisAcquirer?: string | null;
  paymentSettings?: unknown;
}): { serverKey: string; clientKey: string; isProduction: boolean; qrisAcquirer: string } | null {
  const isProduction = (process.env.MIDTRANS_IS_PRODUCTION || "false").toLowerCase() === "true";
  const globalServerKey = process.env.MIDTRANS_SERVER_KEY || "";
  const globalClientKey = process.env.MIDTRANS_CLIENT_KEY || "";
  const globalAcquirer = process.env.MIDTRANS_QRIS_ACQUIRER || "gopay";

  const mode = (business.midtransMode as string) || "global";
  if (mode === "custom" && business.midtransServerKeyEnc) {
    try {
      const serverKey = decrypt(business.midtransServerKeyEnc);
      const clientKey = (business.midtransClientKey as string) || globalClientKey;
      const acquirer = (business.midtransQrisAcquirer as string) || globalAcquirer;
      if (!serverKey) return null;
      return { serverKey, clientKey, isProduction, qrisAcquirer: acquirer };
    } catch {
      return null;
    }
  }
  if (!globalServerKey) return null;
  return { serverKey: globalServerKey, clientKey: globalClientKey, isProduction, qrisAcquirer: globalAcquirer };
}

function midtransBaseUrl(isProduction: boolean): string {
  return isProduction ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

function notificationUrl(): string | undefined {
  return process.env.MIDTRANS_NOTIFICATION_URL || undefined;
}

export function resolveMidtransConfig(business: Parameters<typeof getMidtransConfigForBusiness>[0]) {
  return getMidtransConfigForBusiness(business);
}

export async function createMidtransQrisCharge(params: {
  business: Parameters<typeof getMidtransConfigForBusiness>[0];
  orderNumber: string;
  grossAmount: number;
  customerName?: string | null;
  itemDetails?: { id: string; price: number; quantity: number; name: string }[];
}): Promise<MidtransChargeResult | null> {
  const cfg = getMidtransConfigForBusiness(params.business);
  if (!cfg) return null;
  return createQrisWithConfig(cfg, params.orderNumber, params.grossAmount, params.customerName, params.itemDetails);
}

export type MidtransItemDetail = { id: string; price: number; quantity: number; name: string };

// Bangun item_details Midtrans dari order Prisma.
// - id traceable ke productId (unik per baris: p<productId>[-n] untuk varian ganda).
// - name = productName (+optionsLabel) dipotong 50 char (limit Midtrans).
// - SERVICE & TAX sebagai line item terpisah agar sum(price*qty) == gross_amount.
// - customer_details cukup first_name (sesuai konfirmasi).
export function buildMidtransItemDetails(order: {
  items: Array<{ productId: number; productName: string; price: unknown; quantity: number; optionsLabel?: string | null }>;
  serviceCharge: unknown;
  tax: unknown;
  taxLabel?: string | null;
}): MidtransItemDetail[] {
  const seen = new Map<number, number>();
  const items: MidtransItemDetail[] = (order.items || []).map((i) => {
    const count = (seen.get(i.productId) || 0) + 1;
    seen.set(i.productId, count);
    const baseName = String(i.productName || "Item");
    const variant = i.optionsLabel ? ` (${i.optionsLabel})` : "";
    return {
      id: count > 1 ? `p${i.productId}-${count}` : `p${i.productId}`,
      price: Math.round(Number(i.price) || 0),
      quantity: Math.max(1, Math.round(Number(i.quantity) || 1)),
      name: `${baseName}${variant}`.slice(0, 50),
    };
  });

  const service = Math.round(Number(order.serviceCharge) || 0);
  if (service > 0) {
    items.push({ id: "SERVICE", price: service, quantity: 1, name: "Service Charge" });
  }
  const tax = Math.round(Number(order.tax) || 0);
  if (tax > 0) {
    const label = String(order.taxLabel || "Pajak").slice(0, 50);
    items.push({ id: "TAX", price: tax, quantity: 1, name: label });
  }
  return items.filter((i) => i.price >= 0 && i.quantity >= 1 && i.name.length > 0);
}

function sanitizedItemDetails(
  itemDetails: MidtransItemDetail[] | undefined,
  grossAmount: number
): MidtransItemDetail[] | undefined {
  if (!itemDetails || itemDetails.length === 0) return undefined;
  const sum = itemDetails.reduce((s, i) => s + i.price * i.quantity, 0);
  // Midtrans tolak jika sum != gross_amount → omit seluruhnya agar charge tetap sukses.
  if (sum !== Math.round(grossAmount)) return undefined;
  return itemDetails;
}

export async function createMidtransChargeForMethod(params: {
  business: Parameters<typeof getMidtransConfigForBusiness>[0];
  method: "qris" | "ewallet" | "bank_transfer";
  orderNumber: string;
  grossAmount: number;
  customerName?: string | null;
  paymentSettings?: Record<string, { acquirer?: string; bank?: string; channel?: string; wallets?: string[] }>;
  itemDetails?: MidtransItemDetail[];
}): Promise<MidtransChargeResult | null> {
  const cfg = getMidtransConfigForBusiness(params.business);
  if (!cfg) return null;

  const ps = params.paymentSettings || {};
  const item_details = sanitizedItemDetails(params.itemDetails, params.grossAmount);
  if (params.method === "qris") {
    // Acquirer opsional — Midtrans default gopay. Jangan kirim field qris sama sekali
    // agar ikut default Midtrans (sesuai docs: qris object Optional).
    return chargeWithBody(cfg, {
      payment_type: "qris",
      transaction_details: { order_id: params.orderNumber, gross_amount: params.grossAmount },
      customer_details: { first_name: params.customerName || "Tamu" },
      ...(item_details ? { item_details } : {}),
    });
  }
  if (params.method === "ewallet") {
    // Gopay / Shopeepay via Core API
    const channel = (ps.ewallet?.channel as string) || (ps.ewallet?.wallets as string[])?.[0] || "gopay";
    if (channel === "shopeepay") {
      return chargeWithBody(cfg, {
        payment_type: "shopeepay",
        transaction_details: { order_id: params.orderNumber, gross_amount: params.grossAmount },
        customer_details: { first_name: params.customerName || "Tamu" },
        ...(item_details ? { item_details } : {}),
        shopeepay: { callback_url: process.env.MIDTRANS_NOTIFICATION_URL || "" },
      });
    }
    return chargeWithBody(cfg, {
      payment_type: "gopay",
      transaction_details: { order_id: params.orderNumber, gross_amount: params.grossAmount },
      customer_details: { first_name: params.customerName || "Tamu" },
      ...(item_details ? { item_details } : {}),
      gopay: { enable_callback: true, callback_url: process.env.MIDTRANS_NOTIFICATION_URL || "" },
    });
  }
  if (params.method === "bank_transfer") {
    const bank = (ps.bank_transfer?.bank as string) || "bni";
    return chargeWithBody(cfg, {
      payment_type: "bank_transfer",
      transaction_details: { order_id: params.orderNumber, gross_amount: params.grossAmount },
      customer_details: { first_name: params.customerName || "Tamu" },
      ...(item_details ? { item_details } : {}),
      bank_transfer: { bank },
    });
  }
  return null;
}

async function createQrisWithConfig(
  cfg: { serverKey: string; isProduction: boolean; qrisAcquirer: string },
  orderNumber: string,
  grossAmount: number,
  customerName?: string | null,
  itemDetails?: { id: string; price: number; quantity: number; name: string }[]
): Promise<MidtransChargeResult> {
  // Jangan kirim qris.acquirer — ikut default Midtrans (gopay).
  return chargeWithBody(cfg, {
    payment_type: "qris",
    transaction_details: { order_id: orderNumber, gross_amount: grossAmount },
    customer_details: { first_name: customerName || "Tamu" },
    ...(itemDetails ? { item_details: itemDetails } : {}),
  });
}

async function chargeWithBody(
  cfg: { serverKey: string; isProduction: boolean },
  body: Record<string, unknown>
): Promise<MidtransChargeResult> {
  const url = `${midtransBaseUrl(cfg.isProduction)}/v2/charge`;
  const auth = Buffer.from(`${cfg.serverKey}:`).toString("base64");
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Basic ${auth}`,
  };
  const notif = notificationUrl();
  if (notif) headers["X-Override-Notification"] = notif;

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const data = (await res.json()) as Record<string, unknown>;
  
  if (!res.ok) {
    const msg = (data.status_message as string) || `Midtrans charge failed ${res.status}`;
    // Ambil detail validation message kalo ada
    const validationMsgs = Array.isArray(data.validation_messages) 
      ? ` (${(data.validation_messages as string[]).join(", ")})` 
      : "";
    
    throw new Error(`${msg}${validationMsgs}`);
  }

  const transactionId = (data.transaction_id as string) || "";
  const orderId = (data.order_id as string) || (body.transaction_details as { order_id: string })?.order_id || "";
  const grossAmount = String(data.gross_amount ?? (body.transaction_details as { gross_amount: number })?.gross_amount ?? "");
  const actions = (data.actions as { name: string; url: string }[]) || [];
  const qrUrl = actions.find((a) => a.name === "generate-qr-code-v2")?.url || actions.find((a) => a.name === "generate-qr-code")?.url;
  const qrString = data.qr_string as string | undefined;
  const vaNumbers = data.va_numbers as { bank: string; va_number: string }[] | undefined;
  const vaNumber = vaNumbers?.[0]?.va_number;
  const vaBank = vaNumbers?.[0]?.bank;
  const redirectUrl = (data.redirect_url as string) || (actions.find((a) => a.name === "deeplink-redirect")?.url);

  return { transactionId, orderId, grossAmount, qrUrl, qrString, vaNumber, vaBank, redirectUrl, raw: data };
}

export function verifyMidtransSignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  serverKey: string;
}): boolean {
  const expected = crypto
    .createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${payload.serverKey}`)
    .digest("hex");
  return expected === payload.signature_key;
}

export async function getMidtransTransactionStatus(
  business: Parameters<typeof getMidtransConfigForBusiness>[0],
  orderId: string
): Promise<Record<string, unknown> | null> {
  const cfg = getMidtransConfigForBusiness(business);
  if (!cfg) return null;
  const url = `${midtransBaseUrl(cfg.isProduction)}/v2/${encodeURIComponent(orderId)}/status`;
  const auth = Buffer.from(`${cfg.serverKey}:`).toString("base64");
  const res = await fetch(url, { headers: { Accept: "application/json", Authorization: `Basic ${auth}` } });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

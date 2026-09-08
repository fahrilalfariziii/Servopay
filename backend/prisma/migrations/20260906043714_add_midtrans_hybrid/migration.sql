-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "midtrans_client_key" TEXT,
ADD COLUMN     "midtrans_mode" TEXT NOT NULL DEFAULT 'global',
ADD COLUMN     "midtrans_qris_acquirer" TEXT,
ADD COLUMN     "midtrans_server_key_enc" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "gateway_data" JSONB;

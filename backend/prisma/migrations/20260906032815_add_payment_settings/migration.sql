-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "enabled_payment_methods" JSONB NOT NULL DEFAULT '["cash", "qris"]',
ADD COLUMN     "payment_settings" JSONB DEFAULT '{}';

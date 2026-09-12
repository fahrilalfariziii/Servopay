-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "batch_no" TEXT,
ADD COLUMN     "expiry_date" TIMESTAMP(3),
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "reference_no" TEXT,
ADD COLUMN     "supplier" TEXT,
ADD COLUMN     "unit_cost" DECIMAL(14,2);

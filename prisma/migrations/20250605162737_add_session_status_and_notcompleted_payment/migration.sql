-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'NotCompleted';

-- DropIndex
DROP INDEX "Session_restaurantId_tableId_customerNumber_paymentStatus_idx";

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "sessionStatus" TEXT NOT NULL DEFAULT 'Active';

-- CreateIndex
CREATE INDEX "Session_restaurantId_tableId_customerNumber_paymentStatus_s_idx" ON "Session"("restaurantId", "tableId", "customerNumber", "paymentStatus", "sessionStatus");

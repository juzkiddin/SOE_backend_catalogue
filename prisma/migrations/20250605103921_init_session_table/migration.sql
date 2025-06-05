-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Confirmed', 'Failed', 'Expired');

-- CreateTable
CREATE TABLE "Session" (
    "sessionId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "tableId" TEXT NOT NULL,
    "sessionStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionEnd" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_billId_key" ON "Session"("billId");

-- CreateIndex
CREATE INDEX "Session_restaurantId_tableId_customerNumber_paymentStatus_idx" ON "Session"("restaurantId", "tableId", "customerNumber", "paymentStatus");

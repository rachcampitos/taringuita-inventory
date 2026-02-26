-- CreateEnum
CREATE TYPE "DeliveryDay" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'SENT', 'RECEIVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "brands" TEXT[],
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "deliveryDay" "DeliveryDay",
ADD COLUMN     "supplier" TEXT,
ADD COLUMN     "unitCost" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "locationId" TEXT;

-- CreateTable
CREATE TABLE "product_price_history" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_consumptions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "consumption" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_requests" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "requestDate" DATE NOT NULL,
    "deliveryDay" "DeliveryDay" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentStock" DECIMAL(10,2) NOT NULL,
    "weeklyAvgConsumption" DECIMAL(10,2) NOT NULL,
    "suggestedQty" DECIMAL(10,2) NOT NULL,
    "confirmedQty" DECIMAL(10,2),
    "unitOfOrder" "UnitOfMeasure" NOT NULL DEFAULT 'UN',
    "conversionFactor" DECIMAL(10,4) NOT NULL,
    "unitCost" DECIMAL(12,2),

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_price_history_productId_effectiveFrom_idx" ON "product_price_history"("productId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "weekly_consumptions_stationId_weekStart_idx" ON "weekly_consumptions"("stationId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_consumptions_productId_stationId_weekStart_key" ON "weekly_consumptions"("productId", "stationId", "weekStart");

-- CreateIndex
CREATE INDEX "order_requests_locationId_requestDate_idx" ON "order_requests"("locationId", "requestDate");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_consumptions" ADD CONSTRAINT "weekly_consumptions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_consumptions" ADD CONSTRAINT "weekly_consumptions_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

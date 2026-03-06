-- CreateTable
CREATE TABLE "requisitions" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisition_items" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "requisition_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requisitions_stationId_date_idx" ON "requisitions"("stationId", "date");

-- CreateIndex
CREATE INDEX "requisitions_date_idx" ON "requisitions"("date");

-- CreateIndex
CREATE INDEX "requisition_items_requisitionId_idx" ON "requisition_items"("requisitionId");

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_items" ADD CONSTRAINT "requisition_items_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_items" ADD CONSTRAINT "requisition_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

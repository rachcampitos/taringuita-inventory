-- CreateIndex
CREATE UNIQUE INDEX "production_logs_stationId_productId_date_key" ON "production_logs"("stationId", "productId", "date");

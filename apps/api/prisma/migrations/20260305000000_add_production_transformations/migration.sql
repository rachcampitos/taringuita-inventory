-- CreateTable
CREATE TABLE "production_transformations" (
    "id" TEXT NOT NULL,
    "inputProductId" TEXT NOT NULL,
    "inputQuantity" DECIMAL(10,2) NOT NULL,
    "mermaQuantity" DECIMAL(10,2) NOT NULL,
    "mermaPercent" DECIMAL(5,2) NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "recipeId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_transformations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transformation_outputs" (
    "id" TEXT NOT NULL,
    "transformationId" TEXT NOT NULL,
    "outputProductId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "transformation_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "production_transformations_date_idx" ON "production_transformations"("date");

-- CreateIndex
CREATE INDEX "production_transformations_inputProductId_date_idx" ON "production_transformations"("inputProductId", "date");

-- CreateIndex
CREATE INDEX "transformation_outputs_transformationId_idx" ON "transformation_outputs"("transformationId");

-- AddForeignKey
ALTER TABLE "production_transformations" ADD CONSTRAINT "production_transformations_inputProductId_fkey" FOREIGN KEY ("inputProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_transformations" ADD CONSTRAINT "production_transformations_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_transformations" ADD CONSTRAINT "production_transformations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transformation_outputs" ADD CONSTRAINT "transformation_outputs_transformationId_fkey" FOREIGN KEY ("transformationId") REFERENCES "production_transformations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transformation_outputs" ADD CONSTRAINT "transformation_outputs_outputProductId_fkey" FOREIGN KEY ("outputProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

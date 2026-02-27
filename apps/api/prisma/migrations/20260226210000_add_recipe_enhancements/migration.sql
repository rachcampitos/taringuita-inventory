-- CreateEnum
CREATE TYPE "RecipeType" AS ENUM ('PREPARACION', 'PRODUCCION', 'SEMIELABORADO', 'BASE', 'SALSA', 'POSTRE');

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "type" "RecipeType" NOT NULL DEFAULT 'PREPARACION';

-- CreateTable
CREATE TABLE "recipe_cost_snapshots" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "costPerUnit" DECIMAL(12,2) NOT NULL,
    "ingredientCount" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_cost_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_cost_snapshots_recipeId_calculatedAt_idx" ON "recipe_cost_snapshots"("recipeId", "calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipeId_productId_key" ON "recipe_ingredients"("recipeId", "productId");

-- AddForeignKey
ALTER TABLE "recipe_cost_snapshots" ADD CONSTRAINT "recipe_cost_snapshots_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

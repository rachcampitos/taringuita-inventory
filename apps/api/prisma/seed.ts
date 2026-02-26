import { PrismaClient, Role, UnitOfMeasure, DeliveryDay } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

function log(msg: string): void {
  console.log(`[seed] ${msg}`);
}

// ---------------------------------------------------------------------------
// Types for imported JSON
// ---------------------------------------------------------------------------

interface ProductData {
  code: string;
  name: string;
  family: string;
  sheet: string;
  unitOfMeasure: string;
  unitOfOrder: string;
  conversionFactor: number;
}

interface ImportData {
  families: string[];
  products: ProductData[];
}

// ---------------------------------------------------------------------------
// Unit mapping
// ---------------------------------------------------------------------------

function toUnitEnum(val: string): UnitOfMeasure {
  const map: Record<string, UnitOfMeasure> = {
    KG: UnitOfMeasure.KG,
    LT: UnitOfMeasure.LT,
    UN: UnitOfMeasure.UN,
    GR: UnitOfMeasure.GR,
    ML: UnitOfMeasure.ML,
    PORCIONES: UnitOfMeasure.PORCIONES,
    BANDEJAS: UnitOfMeasure.BANDEJAS,
    BOLSAS: UnitOfMeasure.BOLSAS,
    CAJAS: UnitOfMeasure.CAJAS,
    BIDONES: UnitOfMeasure.BIDONES,
    LATAS: UnitOfMeasure.LATAS,
    PAQUETES: UnitOfMeasure.PAQUETES,
    BOTELLAS: UnitOfMeasure.BOTELLAS,
    SOBRES: UnitOfMeasure.SOBRES,
    ROLLOS: UnitOfMeasure.ROLLOS,
    FRASCOS: UnitOfMeasure.FRASCOS,
    POTES: UnitOfMeasure.POTES,
    TARROS: UnitOfMeasure.TARROS,
    MALLAS: UnitOfMeasure.MALLAS,
    SACOS: UnitOfMeasure.SACOS,
  };
  return map[val] ?? UnitOfMeasure.UN;
}

// ---------------------------------------------------------------------------
// DeliveryDay assignment based on product sheet/family
// ---------------------------------------------------------------------------

function getDeliveryDay(product: ProductData): DeliveryDay | null {
  switch (product.sheet) {
    case 'Cocina VITACURA':
      // Abarrotes and carnes -> MARTES
      return DeliveryDay.MARTES;
    case 'Futas y Verduras':
      // Fresh produce -> MARTES
      return DeliveryDay.MARTES;
    case 'Procesado':
      // Panes and processed -> MIERCOLES
      return DeliveryDay.MIERCOLES;
    case 'Aseo':
    case 'Otros Materiales':
    case 'Cuchillería y Cristalería':
    case 'Articulos de Oficina':
      // Aseo, utensilios -> JUEVES
      return DeliveryDay.JUEVES;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Station assignment logic
// ---------------------------------------------------------------------------

/**
 * Determines which stations a product should be assigned to based on its
 * sheet and family. All kitchen food products go to all 7 stations.
 * Non-food items go to relevant stations.
 */
function getStationAssignments(product: ProductData): string[] {
  const allKitchen = [
    'sta-montaje', 'sta-frio', 'sta-saltado',
    'sta-plancha', 'sta-pizzeria', 'sta-produccion', 'sta-pasteleria',
  ];

  switch (product.sheet) {
    case 'Cocina VITACURA':
    case 'Futas y Verduras':
      // Main kitchen ingredients - available at all stations
      return allKitchen;

    case 'Procesado':
      // Pre-elaborados and salsas - production + all stations (they consume them)
      return allKitchen;

    case 'Personal':
      // Staff food - tracked at production station
      return ['sta-produccion'];

    case 'Aseo':
    case 'Otros Materiales':
      // Cleaning and materials - tracked at montaje (general/front)
      return ['sta-montaje'];

    case 'Cuchillería y Cristalería':
      // Tableware - tracked at montaje
      return ['sta-montaje'];

    case 'Articulos de Oficina':
      // Office supplies - tracked at montaje
      return ['sta-montaje'];

    default:
      return ['sta-montaje'];
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log('Starting seed with real Excel data...');

  // Load extracted data
  const jsonPath = path.join(__dirname, 'products-data.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data: ImportData = JSON.parse(raw);
  log(`Loaded ${data.products.length} products in ${data.families.length} families from JSON`);

  // -------------------------------------------------------------------------
  // 1. Organization
  // -------------------------------------------------------------------------
  log('Upserting organization...');
  const organization = await prisma.organization.upsert({
    where: { id: 'org-taringuita' },
    update: { name: 'Taringuita' },
    create: { id: 'org-taringuita', name: 'Taringuita' },
  });

  // -------------------------------------------------------------------------
  // 2. Locations (7 locales)
  // -------------------------------------------------------------------------
  log('Upserting locations...');

  const locationDefs = [
    { id: 'loc-vitacura',     name: 'Taringuita Vitacura',     address: 'Vitacura, Santiago, Chile',     brands: ['Taringuita'] },
    { id: 'loc-providencia',  name: 'Taringuita Providencia',  address: 'Providencia, Santiago, Chile',  brands: ['Taringuita'] },
    { id: 'loc-las-condes',   name: 'Taringuita Las Condes',   address: 'Las Condes, Santiago, Chile',   brands: ['Taringuita'] },
    { id: 'loc-nunoa',        name: 'Taringuita Nunoa',        address: 'Nunoa, Santiago, Chile',         brands: ['Taringuita'] },
    { id: 'loc-santiago',     name: 'Taringuita Santiago Centro', address: 'Santiago Centro, Chile',      brands: ['Taringuita'] },
    { id: 'loc-la-reina',     name: 'Taringuita La Reina',     address: 'La Reina, Santiago, Chile',     brands: ['Taringuita'] },
    { id: 'loc-lo-barnechea', name: 'Taringuita Lo Barnechea', address: 'Lo Barnechea, Santiago, Chile', brands: ['Taringuita'] },
  ];

  for (const loc of locationDefs) {
    await prisma.location.upsert({
      where: { id: loc.id },
      update: { name: loc.name, address: loc.address, brands: loc.brands },
      create: {
        id: loc.id,
        name: loc.name,
        address: loc.address,
        brands: loc.brands,
        organizationId: organization.id,
      },
    });
    log(`  Location: ${loc.name}`);
  }

  const location = { id: 'loc-vitacura' }; // primary location for stations

  // -------------------------------------------------------------------------
  // 3. Stations (7 kitchen stations)
  // -------------------------------------------------------------------------
  log('Upserting stations...');

  const stationDefs = [
    { id: 'sta-montaje',    name: 'montaje' },
    { id: 'sta-frio',       name: 'frio' },
    { id: 'sta-saltado',    name: 'saltado' },
    { id: 'sta-plancha',    name: 'plancha' },
    { id: 'sta-pizzeria',   name: 'pizzeria' },
    { id: 'sta-produccion', name: 'produccion' },
    { id: 'sta-pasteleria', name: 'pasteleria' },
  ];

  for (const def of stationDefs) {
    await prisma.station.upsert({
      where: { id: def.id },
      update: { name: def.name },
      create: { id: def.id, name: def.name, locationId: location.id },
    });
    log(`  Station: ${def.name}`);
  }

  // -------------------------------------------------------------------------
  // 4. Users
  // -------------------------------------------------------------------------
  log('Upserting users...');

  const userDefs = [
    {
      id: 'usr-raymundo',
      email: 'raymundo@taringuita.cl',
      name: 'Raymundo',
      password: 'admin123',
      role: Role.ADMIN,
      locationId: 'loc-vitacura',
      stationIds: [] as string[],
    },
    {
      id: 'usr-carlos',
      email: 'carlos@taringuita.cl',
      name: 'Carlos',
      password: 'chef123',
      role: Role.HEAD_CHEF,
      locationId: 'loc-vitacura',
      stationIds: ['sta-montaje', 'sta-frio', 'sta-saltado'],
    },
    {
      id: 'usr-maria',
      email: 'maria@taringuita.cl',
      name: 'Maria',
      password: 'chef123',
      role: Role.HEAD_CHEF,
      locationId: 'loc-vitacura',
      stationIds: ['sta-plancha', 'sta-pizzeria', 'sta-produccion', 'sta-pasteleria'],
    },
    {
      id: 'usr-pedro',
      email: 'pedro@taringuita.cl',
      name: 'Pedro',
      password: 'sous123',
      role: Role.SOUS_CHEF,
      locationId: 'loc-vitacura',
      stationIds: ['sta-montaje', 'sta-frio', 'sta-saltado'],
    },
    {
      id: 'usr-ana',
      email: 'ana@taringuita.cl',
      name: 'Ana',
      password: 'sous123',
      role: Role.SOUS_CHEF,
      locationId: 'loc-vitacura',
      stationIds: ['sta-plancha', 'sta-pizzeria', 'sta-produccion', 'sta-pasteleria'],
    },
  ];

  for (const def of userDefs) {
    const hashed = await hashPassword(def.password);

    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: { name: def.name, role: def.role, password: hashed, locationId: def.locationId },
      create: {
        id: def.id,
        email: def.email,
        name: def.name,
        password: hashed,
        role: def.role,
        organizationId: organization.id,
        locationId: def.locationId,
      },
    });

    for (const stationId of def.stationIds) {
      await prisma.userStation.upsert({
        where: { userId_stationId: { userId: user.id, stationId } },
        update: {},
        create: { userId: user.id, stationId },
      });
    }

    log(`  User: ${user.name} (${user.role})`);
  }

  // -------------------------------------------------------------------------
  // 5. Clean up old dummy data
  // -------------------------------------------------------------------------
  log('Cleaning up old dummy data...');

  const oldProducts = await prisma.product.findMany({
    where: { code: { startsWith: 'PRD-' } },
    select: { id: true },
  });
  if (oldProducts.length > 0) {
    const oldIds = oldProducts.map(p => p.id);
    await prisma.stationProduct.deleteMany({ where: { productId: { in: oldIds } } });
    await prisma.inventoryCount.deleteMany({ where: { productId: { in: oldIds } } });
    await prisma.productionLog.deleteMany({ where: { productId: { in: oldIds } } });
    await prisma.product.deleteMany({ where: { id: { in: oldIds } } });
    log(`  Removed ${oldProducts.length} old dummy products.`);
  }

  // Clean empty categories (from old seed)
  const emptyCategories = await prisma.productCategory.findMany({
    where: { products: { none: {} } },
    select: { id: true },
  });
  if (emptyCategories.length > 0) {
    await prisma.productCategory.deleteMany({
      where: { id: { in: emptyCategories.map(c => c.id) } },
    });
    log(`  Removed ${emptyCategories.length} empty categories.`);
  }

  // -------------------------------------------------------------------------
  // 6. Product Categories (from Excel families)
  // -------------------------------------------------------------------------
  log('Upserting product categories...');

  const categoryMap: Record<string, string> = {}; // family name -> category id

  for (let i = 0; i < data.families.length; i++) {
    const familyName = data.families[i];
    const category = await prisma.productCategory.upsert({
      where: { name: familyName },
      update: { sortOrder: i + 1 },
      create: { name: familyName, sortOrder: i + 1 },
    });
    categoryMap[familyName] = category.id;
  }

  log(`  ${data.families.length} categories upserted.`);

  // -------------------------------------------------------------------------
  // 7. Products (596 from Excel)
  // -------------------------------------------------------------------------
  log('Upserting products...');

  const productIdMap: Record<string, string> = {}; // code -> product id
  let productCount = 0;

  for (const p of data.products) {
    const categoryId = categoryMap[p.family];
    if (!categoryId) {
      log(`  WARNING: No category for family "${p.family}", skipping ${p.code}`);
      continue;
    }

    const deliveryDay = getDeliveryDay(p);

    const product = await prisma.product.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        categoryId,
        unitOfMeasure: toUnitEnum(p.unitOfMeasure),
        unitOfOrder: toUnitEnum(p.unitOfOrder),
        conversionFactor: p.conversionFactor,
        deliveryDay,
      },
      create: {
        code: p.code,
        name: p.name,
        categoryId,
        unitOfMeasure: toUnitEnum(p.unitOfMeasure),
        unitOfOrder: toUnitEnum(p.unitOfOrder),
        conversionFactor: p.conversionFactor,
        deliveryDay,
      },
    });

    productIdMap[p.code] = product.id;
    productCount++;
  }

  log(`  ${productCount} products upserted.`);

  // -------------------------------------------------------------------------
  // 7. Station-Product assignments
  // -------------------------------------------------------------------------
  log('Assigning products to stations...');

  // Clear existing station-product links to rebuild cleanly
  await prisma.stationProduct.deleteMany({});

  let spCount = 0;
  const spBatch: { stationId: string; productId: string; sortOrder: number }[] = [];

  // Track sort order per station
  const stationSortOrder: Record<string, number> = {};

  for (const p of data.products) {
    const productId = productIdMap[p.code];
    if (!productId) continue;

    const stationIds = getStationAssignments(p);

    for (const stationId of stationIds) {
      if (!stationSortOrder[stationId]) {
        stationSortOrder[stationId] = 0;
      }
      stationSortOrder[stationId]++;

      spBatch.push({
        stationId,
        productId,
        sortOrder: stationSortOrder[stationId],
      });
      spCount++;
    }
  }

  // Batch insert in chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < spBatch.length; i += chunkSize) {
    const chunk = spBatch.slice(i, i + chunkSize);
    await prisma.stationProduct.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  log(`  ${spCount} station-product assignments created.`);

  // Print per-station counts
  for (const def of stationDefs) {
    const count = stationSortOrder[def.id] ?? 0;
    log(`    ${def.name}: ${count} products`);
  }

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------
  log('');
  log('Seed completed successfully!');
  log(`  Organization : 1`);
  log(`  Locations    : ${locationDefs.length}`);
  log(`  Stations     : ${stationDefs.length}`);
  log(`  Users        : ${userDefs.length}`);
  log(`  Categories   : ${data.families.length}`);
  log(`  Products     : ${productCount}`);
  log(`  SP links     : ${spCount}`);
  log('');
  log('Login credentials:');
  log('  Admin:     raymundo@taringuita.cl / admin123');
  log('  Head Chef: carlos@taringuita.cl / chef123');
  log('  Head Chef: maria@taringuita.cl / chef123');
  log('  Sous Chef: pedro@taringuita.cl / sous123');
  log('  Sous Chef: ana@taringuita.cl / sous123');
}

main()
  .catch((error) => {
    console.error('[seed] ERROR:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
